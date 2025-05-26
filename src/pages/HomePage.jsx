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
  const [demandsByEssence, setDemandsByEssence] = useState({}) // State to hold demands grouped by essenceId

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const [openRows, setOpenRows] = useState({})
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')
  const [demandQuantities, setDemandQuantities] = useState({}) // Her esans için talep adedini tutacak state

  useEffect(() => {
    const unsubscribe = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribe()
  }, [subscribeToEssences])

  // Subscribe to Demands and group them by essenceId
  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const groupedDemands = allDemands.reduce((acc, demand) => {
        const { essenceId } = demand;
        if (!acc[essenceId]) {
          acc[essenceId] = [];
        }
        // Add necessary demand details
        acc[essenceId].push({
          id: demand.id,
          userName: demand.userName || 'Bilinmeyen Kullanıcı', // Add fallback
          amount: demand.amount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date() // Handle potential non-timestamp data
        });
        // Sort demands by date descending within each group
        acc[essenceId].sort((a, b) => b.date - a.date);
        return acc;
      }, {});
      setDemandsByEssence(groupedDemands);
    });

    return () => unsubscribeDemands();
  }, [subscribeToDemands]);

  // Esans yüklenirken varsayılan talep adedini ayarla
  useEffect(() => {
    const initialDemandQuantities = {};
    essences.forEach(essence => {
      initialDemandQuantities[essence.id] = initialDemandQuantities[essence.id] || 1; // Varsayılan 1 adet (50 gram)
    });
    setDemandQuantities(initialDemandQuantities);
  }, [essences]);

  // Talep adedini artır
  const increaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.min((prev[essenceId] || 1) + 1, 5) // Maksimum 5 adet (250 gram)
    }));
  };

  // Talep adedini azalt
  const decreaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.max((prev[essenceId] || 1) - 1, 1) // Minimum 1 adet (50 gram)
    }));
  };

  const handleCreateDemand = async (essence) => {
    const quantity = demandQuantities[essence.id] || 1; // Seçilen adet
    const amount = quantity * 50; // Her adet 50 gram

    try {
      if (essence.stockAmount < amount || essence.totalDemand + amount > essence.stockAmount) {
        setSnackbarMessage('Stok miktarı yetersiz')
        setSnackbarSeverity('error')
        setOpenSnackbar(true)
        return
      }

      // Her adet için ayrı bir talep oluştur
      for (let i = 0; i < quantity; i++) {
        await addDemand(essence.id, {
          amount: 50, // Her talep 50 gram
          totalPrice: 50 * essence.price,
          category: essence.category
        })
      }

      setSnackbarMessage(`${quantity} adet (${amount} gram) talep başarıyla oluşturuldu`)
      setSnackbarSeverity('success')
    } catch (error) {
      setSnackbarMessage(error.message || 'Talep oluşturulurken bilinmeyen bir hata oluştu.')
      setSnackbarSeverity('error')
    }
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

  // Kullanıcının talep ettiği esans ID'lerini belirle
  const userDemandedEssenceIds = useMemo(() => {
    if (!currentUser) return [];
    
    // demandsByEssence'dan kullanıcının talep ettiği esansları bul
    const essenceIds = [];
    Object.entries(demandsByEssence).forEach(([essenceId, demands]) => {
      // Kullanıcının bu esans için talebi var mı kontrol et
      const hasUserDemand = demands.some(demand => 
        demand.userId === currentUser.uid || demand.userName === `${currentUser.firstName} ${currentUser.lastName}`
      );
      if (hasUserDemand) {
        essenceIds.push(essenceId);
      }
    });
    return essenceIds;
  }, [currentUser, demandsByEssence]);

  const filteredEssences = essences
    .filter(essence => {
      const matchesSearch = 
        essence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        essence.code.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesCategory = 
        selectedCategory === 'all' || essence.category === selectedCategory
      
      // Kullanıcının talep ettiği esansları kontrol et
      const isUserDemanded = userDemandedEssenceIds.includes(essence.id);

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
    // Esansları isme göre alfabetik olarak sırala
    .sort((a, b) => a.name.localeCompare(b.name, 'tr-TR'))

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
          <Typography variant="h6">{essence.name}</Typography>
          <IconButton
            size="small"
            onClick={() => toggleRow(essence.id)}
          >
            {openRows[essence.id] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="body2">Kod: {essence.code}</Typography>
          <Typography variant="body2">Kategori: {essence.category || '-'}</Typography>
          <Typography variant="body2">Stok: {essence.stockAmount} gr</Typography>
          <Typography variant="body2">Toplam Talep: {essence.totalDemand} gr</Typography>
          <Typography variant="body2">Birim Fiyat: {essence.price} TL/gr</Typography>
        </Box>

        {/* İlerleme çubuğu */}
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
              label="Bitti"
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
            <Typography variant="subtitle1" gutterBottom>
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
                  <Typography variant="body2">{demand.userName}</Typography>
                  <Typography variant="body2">{demand.amount} gr</Typography>
                  <Typography variant="body2">{new Date(demand.date).toLocaleDateString('tr-TR')}</Typography>
                </Box>
              ))
            ) : (
              <Typography>Bu esans için henüz talep bulunmamaktadır.</Typography>
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
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
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
          </Grid>
          <Grid item xs={12} md={6}>
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
          </Grid>
        </Grid>

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
        
        {/* Bilgilendirme mesajı */}
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
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell />
                  <TableCell>Esans Adı</TableCell>
                  <TableCell>Kod</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell align="center">Stok Miktarı (gr)</TableCell>
                  <TableCell align="center">Toplam Talep (gr)</TableCell>
                  <TableCell align="center">Birim Fiyat (TL/gr)</TableCell>
                  <TableCell align="center">Durum</TableCell>
                  <TableCell align="center">İşlem</TableCell>
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
                        <TableCell align="center">{essence.stockAmount}</TableCell>
                        <TableCell align="center">{essence.totalDemand}</TableCell>
                        <TableCell align="center">{essence.price}</TableCell>
                        <TableCell align="center">
                          {isConfirmedPurchase ? (
                            <Chip
                              icon={<CheckCircleIcon />}
                              label="Kesin Alım"
                              color="warning"
                              variant="outlined"
                            />
                          ) : essence.stockAmount === essence.totalDemand ? (
                            <Chip
                              label="Bitti"
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
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            {/* İlerleme çubuğu */}
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
                            
                            {/* Talep miktarı kontrolleri */}
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
                              <Typography variant="h6" gutterBottom component="div">
                                Talepler
                              </Typography>
                              {demandsByEssence[essence.id] && demandsByEssence[essence.id].length > 0 ? (
                                <Table size="small" aria-label="purchases">
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
                                        <TableCell>{demand.userName}</TableCell>
                                        <TableCell>{demand.amount}</TableCell>
                                        <TableCell>{demand.date.toLocaleDateString()}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              ) : (
                                <Typography>Bu esans için henüz talep bulunmamaktadır.</Typography>
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
