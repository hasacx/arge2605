import React from 'react'
import { useState, useEffect, useMemo } from 'react'
import { useFirebase } from '../firebase/FirebaseContext'
import {
  Box,
  Container,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Snackbar,
  Chip,
  Collapse,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  ButtonGroup,
  Tooltip
} from '@mui/material'
import MuiAlert from '@mui/material/Alert'
import {
  CheckCircle as CheckCircleIcon,
  Autorenew,
  KeyboardArrowDown as KeyboardArrowDownIcon,
  KeyboardArrowUp as KeyboardArrowUpIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material'
import { useTheme, useMediaQuery } from '@mui/material'
import { Grid } from '@mui/material'

function HomePage() {
  const { subscribeToEssences, addDemand, subscribeToDemands, currentUser } = useFirebase()
  const [essences, setEssences] = useState([])
  const [demandsByEssence, setDemandsByEssence] = useState({})
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [openRows, setOpenRows] = useState({})
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')
  const [demandQuantities, setDemandQuantities] = useState({})
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const maskUserName = (name) => {
    if (!name || typeof name !== 'string') return 'Bilinmeyen';
    const parts = name.split(' ');
    if (parts.length > 1) {
      const lastName = parts.pop();
      const maskedLastName = lastName.charAt(0) + '***';
      return [...parts, maskedLastName].join(' ');
    }
    return name.charAt(0) + '***';
  };

  useEffect(() => {
    const unsubscribe = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribe()
  }, [subscribeToEssences, refreshTrigger])

  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const groupedDemands = allDemands.reduce((acc, demand) => {
        const { essenceId } = demand
        if (!acc[essenceId]) {
          acc[essenceId] = []
        }
        acc[essenceId].push({
          id: demand.id,
          userId: demand.userId,
          userName: demand.userName || 'Bilinmeyen Kullanıcı',
          amount: demand.amount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date()
        })
        acc[essenceId].sort((a, b) => b.date - a.date)
        return acc
      }, {})
      setDemandsByEssence(groupedDemands)

      // Taleplerin toplamını kontrol ederek essences state'ini güncelle
      setEssences(prevEssences =>
        prevEssences.map(essence => {
          const demands = groupedDemands[essence.id] || []
          const calculatedTotalDemand = demands.reduce((sum, demand) => sum + demand.amount, 0)
          return {
            ...essence,
            totalDemand: calculatedTotalDemand // totalDemand'ı taleplerin toplamıyla güncelle
          }
        })
      )
    })

    return () => unsubscribeDemands()
  }, [subscribeToDemands, refreshTrigger])

  useEffect(() => {
    const initialDemandQuantities = {}
    essences.forEach(essence => {
      initialDemandQuantities[essence.id] = initialDemandQuantities[essence.id] || 1
    })
    setDemandQuantities(initialDemandQuantities)
  }, [essences])

  const increaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.min((prev[essenceId] || 1) + 1, 5)
    }))
  }

  const decreaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.max((prev[essenceId] || 1) - 1, 1)
    }))
  }

  const handleCreateDemand = async (essence) => {
    const quantity = demandQuantities[essence.id] || 1
    const amount = quantity * 50 // Toplam talep edilen gramaj

    try {
      if (essence.stockAmount < amount || essence.totalDemand + amount > essence.stockAmount) {
        setSnackbarMessage('Stok miktarı yetersiz')
        setSnackbarSeverity('error')
        setOpenSnackbar(true)
        return
      }

      // Her adet için ayrı talep oluştur
      for (let i = 0; i < quantity; i++) {
        await addDemand(essence.id, {
          amount: 50,
          totalPrice: 50 * essence.price,
          category: essence.category,
          userId: currentUser?.uid,
          userName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Bilinmeyen Kullanıcı'
        })
      }

      // Optimistik güncelleme kaldırıldı, çünkü Firebase'den gelen veriyle senkronize edilecek
      setSnackbarMessage(`${quantity} adet (${amount} gram) talep başarıyla oluşturuldu`)
      setSnackbarSeverity('success')
    } catch (error) {
      setSnackbarMessage(error.message || 'Talep oluşturulurken bilinmeyen bir hata oluştu.')
      setSnackbarSeverity('error')
    }
    setOpenSnackbar(true)
  }

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1)
    setSnackbarMessage('Veriler yenileniyor...')
    setSnackbarSeverity('info')
    setOpenSnackbar(true)
  }

  const toggleRow = (id) => {
    setOpenRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [...new Set(essences.map(essence => essence.category))].filter(Boolean)

  const userDemandedEssenceIds = useMemo(() => {
    if (!currentUser) return []
    
    const essenceIds = []
    Object.entries(demandsByEssence).forEach(([essenceId, demands]) => {
      const hasUserDemand = demands.some(demand => 
        demand.userId === currentUser.uid ||
        demand.userName === `${currentUser.firstName} ${currentUser.lastName}`.trim()
      )
      if (hasUserDemand) {
        essenceIds.push(essenceId)
      }
    })
    return essenceIds
  }, [currentUser, demandsByEssence])

  const filteredEssences = essences
    .filter(essence => {
      const matchesSearch = 
        essence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        essence.code.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = 
        selectedCategory === 'all' || essence.category === selectedCategory
        
      const isUserDemanded = userDemandedEssenceIds.includes(essence.id)

      switch(activeFilter) {
        case 'confirmed':
          return matchesSearch && matchesCategory && essence.totalDemand >= 250
        case 'under250':
          return matchesSearch && matchesCategory && essence.totalDemand < 250
        case 'outOfStock':
          return matchesSearch && matchesCategory && essence.stockAmount === essence.totalDemand
        case 'myDemands':
          return matchesSearch && matchesCategory && isUserDemanded
        default:
          return matchesSearch && matchesCategory
      }
    })
    .sort((a, b) => b.totalDemand - a.totalDemand)

  const renderMobileCard = (essence) => {
    const isConfirmedPurchase = essence.totalDemand >= 250
        
    return (
      <Paper
        key={essence.id}
        sx={{
          p: 2,
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {essence.name}
          <IconButton
            size="small"
            onClick={() => toggleRow(essence.id)}
          >
            {openRows[essence.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          Kod: {essence.code}
          Kategori: {essence.category || '-'}
          Stok: {essence.stockAmount} gr
          Toplam Talep: {essence.totalDemand} gr
          Birim Fiyat: {essence.price} TL/gr
        </Box>

        <Box sx={{ mt: 2, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption">
              Talep Durumu: {essence.totalDemand} / 250 gr
            </Typography>
            <Typography variant="caption">
              {Math.min(Math.round((essence.totalDemand / 250) * 100), 100)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min((essence.totalDemand / 250) * 100, 100)}
            color={isConfirmedPurchase ? "success" : "primary"}
            sx={{ height: 8, borderRadius: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          {isConfirmedPurchase ? (
            <Chip
              icon={<CheckCircleIcon />}
              label="Kesin Alım"
              color="warning"
              variant="outlined"
              size="small"
            />
          ) : essence.stockAmount === essence.totalDemand ? (
            <Chip
              icon={<Autorenew />}
              label="Stok Tükendi"
              color="error"
              variant="outlined"
              size="small"
            />
          ) : (
            <Chip
              icon={<Autorenew />}
              label="Talep Toplanıyor"
              color="primary"
              variant="outlined"
              size="small"
            />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ButtonGroup size="small" sx={{ mr: 1 }}>
              <Button
                onClick={() => decreaseDemandQuantity(essence.id)}
                disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
              >
                <RemoveIcon fontSize="small" />
              </Button>
              <Button disabled sx={{ px: 1, minWidth: '40px' }}>
                {demandQuantities[essence.id] || 1} adet
              </Button>
              <Button
                onClick={() => increaseDemandQuantity(essence.id)}
                disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
              >
                <AddIcon fontSize="small" />
              </Button>
            </ButtonGroup>

            <Button
              variant="contained"
              color="primary"
              onClick={() => handleCreateDemand(essence)}
              disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
              size="small"
            >
              Talep Oluştur
            </Button>
          </Box>
        </Box>

        <Collapse in={openRows[essence.id]} timeout="auto" unmountOnExit>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Talepler
            </Typography>
            {demandsByEssence[essence.id] && demandsByEssence[essence.id].length > 0 ? (
              demandsByEssence[essence.id].map((demand) => (
                <Box
                  key={demand.id}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    p: 1,
                    borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
                  }}
                >
                  <Typography>{currentUser?.role === 'admin' ? demand.userName : maskUserName(demand.userName)}</Typography>
                  <Typography>{demand.amount} gr</Typography>
                  <Typography>{new Date(demand.date).toLocaleDateString('tr-TR')}</Typography>
                </Box>
              ))
            ) : (
              <Typography variant="body2">
                Bu esans için henüz talep bulunmamaktadır.
              </Typography>
            )}
          </Box>
        </Collapse>
      </Paper>
    )
  }

  return (
    <Box sx={{
      width: '100%',
      height: '100%',
      p: { xs: 1, sm: 2 },
      overflow: 'hidden'
    }}>
      <Box sx={{
        mb: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }}>
        <FormControl fullWidth>
          <InputLabel id="category-select-label">Kategori</InputLabel>
          <Select
            labelId="category-select-label"
            value={selectedCategory}
            label="Kategori"
            onChange={(e) => setSelectedCategory(e.target.value)}
            sx={{
              bgcolor: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <MenuItem value="all">Tüm Kategoriler</MenuItem>
            {categories.map(category => (
              <MenuItem key={category} value={category}>{category}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          variant="outlined"
          placeholder="Esans adı veya kodu ile arama yapın..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            bgcolor: 'white',
            borderRadius: 1,
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
              },
            },
          }}
        />

        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 1
        }}>
          <Button
            variant={activeFilter === 'all' ? 'contained' : 'outlined'}
            onClick={() => setActiveFilter('all')}
            sx={{ flex: 1 }}
          >
            Tümü
          </Button>
          <Button
            variant={activeFilter === 'confirmed' ? 'contained' : 'outlined'}
            onClick={() => setActiveFilter('confirmed')}
            sx={{ flex: 1 }}
          >
            Kesin Alınacaklar
          </Button>
          <Button
            variant={activeFilter === 'under250' ? 'contained' : 'outlined'}
            onClick={() => setActiveFilter('under250')}
            sx={{ flex: 1 }}
          >
            250gr Altı
          </Button>
          <Button
            variant={activeFilter === 'outOfStock' ? 'contained' : 'outlined'}
            onClick={() => setActiveFilter('outOfStock')}
            sx={{ flex: 1 }}
          >
            Bitenler
          </Button>
          <Button
            variant={activeFilter === 'myDemands' ? 'contained' : 'outlined'}
            onClick={() => setActiveFilter('myDemands')}
            sx={{ flex: 1 }}
          >
            Taleplerim
          </Button>
        </Box>

        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<Autorenew />}
          sx={{ mt: 1, alignSelf: 'flex-end' }}
        >
          Verileri Yenile
        </Button>

        <Paper
          elevation={2}
          sx={{
            mt: 2,
            p: 2,
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            border: '1px solid rgba(255, 152, 0, 0.5)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              textAlign: 'center',
              color: 'warning.dark'
            }}
          >
            250 Gram üstüne ulaşan esanslar kesin alımdır. 250 grama ulaştığı taktirde üstü mühim değildir, alım sonunda alınan miktar kadar sipariş geçilecektir.
          </Typography>
        </Paper>
      </Box>

      <Box sx={{
        overflow: 'auto',
        maxWidth: '100%',
        '& .MuiTableContainer-root': {
          overflow: 'auto'
        },
        '& .MuiTable-root': {
          minWidth: { xs: 800, md: '100%' }
        }
      }}>
        {isMobile ? (
          <Box sx={{ mt: 2 }}>
            {filteredEssences.map(renderMobileCard)}
          </Box>
        ) : (
          <TableContainer component={Paper}>
            <Table aria-label="collapsible table">
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Esans Adı</TableCell>
                  <TableCell>Kod</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Stok Miktarı (gr)</TableCell>
                  <TableCell>Toplam Talep (gr)</TableCell>
                  <TableCell>Birim Fiyat (TL/gr)</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEssences.map((essence) => {
                  const isConfirmedPurchase = essence.totalDemand >= 250
                  
                  return (
                    <React.Fragment key={essence.id}>
                      <TableRow>
                        <TableCell>
                          <IconButton
                            aria-label="expand row"
                            size="small"
                            onClick={() => toggleRow(essence.id)}
                          >
                            {openRows[essence.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell>{essence.name}</TableCell>
                        <TableCell>{essence.code}</TableCell>
                        <TableCell>{essence.category || '-'}</TableCell>
                        <TableCell>{essence.stockAmount}</TableCell>
                        <TableCell>{essence.totalDemand}</TableCell>
                        <TableCell>{essence.price}</TableCell>
                        <TableCell>
                          {isConfirmedPurchase ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Kesin Alım"
                              color="warning"
                              variant="outlined"
                            />
                          ) : essence.stockAmount === essence.totalDemand ? (
                            <Chip
                              icon={<Autorenew />}
                              label="Stok Tükendi"
                              color="error"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              icon={<Autorenew />}
                              label="Talep Toplanıyor"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: '100%', mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                <Typography variant="caption">
                                  {essence.totalDemand} / 250 gr
                                </Typography>
                                <Typography variant="caption">
                                  {Math.min(Math.round((essence.totalDemand / 250) * 100), 100)}%
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min((essence.totalDemand / 250) * 100, 100)}
                                color={isConfirmedPurchase ? "success" : "primary"}
                                sx={{ height: 6, borderRadius: 1 }}
                              />
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ButtonGroup size="small">
                                <Button
                                  onClick={() => decreaseDemandQuantity(essence.id)}
                                  disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
                                >
                                  <RemoveIcon fontSize="small" />
                                </Button>
                                <Button disabled sx={{ px: 1, minWidth: '40px' }}>
                                  {demandQuantities[essence.id] || 1}
                                </Button>
                                <Button
                                  onClick={() => increaseDemandQuantity(essence.id)}
                                  disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
                                >
                                  <AddIcon fontSize="small" />
                                </Button>
                              </ButtonGroup>

                              <Button
                                variant="contained"
                                color="primary"
                                onClick={() => handleCreateDemand(essence)}
                                disabled={essence.stockAmount === 0 || essence.stockAmount === essence.totalDemand}
                                size="small"
                              >
                                Talep Oluştur
                              </Button>
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                          <Collapse in={openRows[essence.id]} timeout="auto" unmountOnExit>
                            <Box sx={{ margin: 1 }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Talepler
                              </Typography>
                              {demandsByEssence[essence.id] && demandsByEssence[essence.id].length > 0 ? (
                                <Table size="small">
                                  <TableHead>
                                    <TableRow>
                                      <TableCell>Kullanıcı</TableCell>
                                      <TableCell>Miktar (gr)</TableCell>
                                      <TableCell>Tarih</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {demandsByEssence[essence.id].map((demand) => (
                                      <TableRow key={demand.id}>
                                        <TableCell>{currentUser?.role === 'admin' ? demand.userName : maskUserName(demand.userName)}</TableCell>
                                        <TableCell>{demand.amount} gr</TableCell>
                                        <TableCell>{new Date(demand.date).toLocaleDateString('tr-TR')}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <Typography variant="body2">
                                  Bu esans için henüz talep bulunmamaktadır.
                                </Typography>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={() => setOpenSnackbar(false)}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbarSeverity}
          onClose={() => setOpenSnackbar(false)}
        >
          {snackbarMessage}
        </MuiAlert>
      </Snackbar>
    </Box>
  )
}

export default HomePage
