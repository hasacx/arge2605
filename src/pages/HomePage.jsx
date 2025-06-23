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
  // Firebase bağlamından gerekli fonksiyonları ve kullanıcı bilgisini alıyoruz
  const { subscribeToEssences, addDemand, subscribeToDemands, currentUser } = useFirebase()

  // Esans listesini tutan state
  const [essences, setEssences] = useState([])
  // Esanslara göre gruplandırılmış talepleri tutan state
  const [demandsByEssence, setDemandsByEssence] = useState({})

  // Tema ve mobil görünüm için medya sorgusu
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Açık/kapalı satırları yöneten state (genişletilebilir tablolar için)
  const [openRows, setOpenRows] = useState({})
  // Snackbar bildirimlerini yöneten state'ler
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState('')
  const [snackbarSeverity, setSnackbarSeverity] = useState('success')
  // Her esans için talep edilecek adedi tutan state
  const [demandQuantities, setDemandQuantities] = useState({})

  // Verilerin manuel olarak yenilenmesini tetikleyen sayaç
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Firebase'deki esans koleksiyonunu dinleyen useEffect
  // refreshTrigger değiştiğinde yeniden tetiklenir
  useEffect(() => {
    const unsubscribe = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribe()
  }, [subscribeToEssences, refreshTrigger])

  // Firebase'deki talep koleksiyonunu dinleyen ve talepleri esans ID'sine göre gruplayan useEffect
  // refreshTrigger değiştiğinde yeniden tetiklenir
  useEffect(() => {
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const groupedDemands = allDemands.reduce((acc, demand) => {
        const { essenceId } = demand;
        if (!acc[essenceId]) {
          acc[essenceId] = [];
        }
        acc[essenceId].push({
          id: demand.id,
          userId: demand.userId, // Kullanıcı ID'sini de ekleyelim
          userName: demand.userName || 'Bilinmeyen Kullanıcı',
          amount: demand.amount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date()
        });
        acc[essenceId].sort((a, b) => b.date - a.date); // Talepleri tarihe göre sırala
        return acc;
      }, {});
      setDemandsByEssence(groupedDemands);
    });

    return () => unsubscribeDemands();
  }, [subscribeToDemands, refreshTrigger]);

  // Esanslar yüklendiğinde veya değiştiğinde varsayılan talep adetlerini ayarlar
  useEffect(() => {
    const initialDemandQuantities = {};
    essences.forEach(essence => {
      initialDemandQuantities[essence.id] = initialDemandQuantities[essence.id] || 1; // Varsayılan 1 adet (50 gram)
    });
    setDemandQuantities(initialDemandQuantities);
  }, [essences]);

  // Talep adedini artıran fonksiyon (maksimum 5 adet)
  const increaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.min((prev[essenceId] || 1) + 1, 5) // Maksimum 5 adet (250 gram)
    }));
  };

  // Talep adedini azaltan fonksiyon (minimum 1 adet)
  const decreaseDemandQuantity = (essenceId) => {
    setDemandQuantities(prev => ({
      ...prev,
      [essenceId]: Math.max((prev[essenceId] || 1) - 1, 1) // Minimum 1 adet (50 gram)
    }));
  };

  // Talep oluşturma işlemi
  const handleCreateDemand = async (essence) => {
    const quantity = demandQuantities[essence.id] || 1; // Seçilen adet
    const amount = quantity * 50; // Her adet 50 gram

    try {
      // Stok kontrolü yapılıyor
      if (essence.stockAmount < amount || essence.totalDemand + amount > essence.stockAmount) {
        setSnackbarMessage('Stok miktarı yetersiz')
        setSnackbarSeverity('error')
        setOpenSnackbar(true)
        return
      }

      // Optimistik güncelleme: UI'yı hemen güncelle
      // totalDemand artık Cloud Function tarafından güncelleneceği için,
      // bu optimistik güncelleme sadece görsel bir geri bildirim sağlar.
      // Firebase'den gelen gerçek data ile üzerine yazılacaktır.
      setEssences(prevEssences =>
        prevEssences.map(e =>
          e.id === essence.id
            ? { ...e, totalDemand: e.totalDemand + amount }
            : e
        )
      );

      // Her adet için ayrı bir talep oluştur (her talep 50 gram)
      // userId bilgisi burada eklenecek
      for (let i = 0; i < quantity; i++) {
        await addDemand(essence.id, {
          amount: 50, // Her talep 50 gram
          totalPrice: 50 * essence.price,
          category: essence.category,
          userId: currentUser?.uid, // Kullanıcı ID'sini ekle
          userName: `${currentUser?.firstName || ''} ${currentUser?.lastName || ''}`.trim() || 'Bilinmeyen Kullanıcı'
        })
      }

      setSnackbarMessage(`${quantity} adet (${amount} gram) talep başarıyla oluşturuldu`)
      setSnackbarSeverity('success')
    } catch (error) {
      // Hata durumunda optimistik güncellemeyi geri al
      // Cloud Function tarafından gelecek olan doğru veri yine de üzerine yazacaktır
      setEssences(prevEssences =>
        prevEssences.map(e =>
          e.id === essence.id
            ? { ...e, totalDemand: e.totalDemand - amount }
            : e
        )
      );
      setSnackbarMessage(error.message || 'Talep oluşturulurken bilinmeyen bir hata oluştu.')
      setSnackbarSeverity('error')
    }
    setOpenSnackbar(true)
  }

  // "Verileri Yenile" butonu için fonksiyon
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1); // Sayacı artırarak useEffect'leri yeniden tetikler
    setSnackbarMessage('Veriler yenileniyor...');
    setSnackbarSeverity('info');
    setOpenSnackbar(true);
  };

  // Satır açma/kapama (collapse) işlemi
  const toggleRow = (id) => {
    setOpenRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }))
  }

  // Arama ve filtreleme state'leri
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')

  // Mevcut esanslardan kategori listesi oluşturur
  const categories = [...new Set(essences.map(essence => essence.category))].filter(Boolean)

  // Mevcut kullanıcının talep ettiği esans ID'lerini hesaplar
  const userDemandedEssenceIds = useMemo(() => {
    if (!currentUser) return [];
    
    const essenceIds = [];
    Object.entries(demandsByEssence).forEach(([essenceId, demands]) => {
      const hasUserDemand = demands.some(demand => 
        demand.userId === currentUser.uid || // Kullanıcı ID'si ile kontrol
        demand.userName === `${currentUser.firstName} ${currentUser.lastName}`.trim() // Kullanıcı adı ile yedek kontrol
      );
      if (hasUserDemand) {
        essenceIds.push(essenceId);
      }
    });
    return essenceIds;
  }, [currentUser, demandsByEssence]);

  // Filtrelenmiş ve sıralanmış esans listesini hesaplar
  const filteredEssences = essences
    .filter(essence => {
      const matchesSearch = 
        essence.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        essence.code.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = 
        selectedCategory === 'all' || essence.category === selectedCategory
        
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
    .sort((a, b) => b.totalDemand - a.totalDemand) // totalDemand'a göre azalan sıralama

  // Mobil görünüm için kart bileşeni
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
                  <Typography>{demand.userName}</Typography>
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

        {/* Verileri Yenile butonu */}
        <Button
          variant="outlined"
          onClick={handleRefresh}
          startIcon={<Autorenew />}
          sx={{ mt: 1, alignSelf: 'flex-end' }} // Sağ tarafa yaslamak için
        >
          Verileri Yenile
        </Button>

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
                                        <TableCell>{demand.userName}</TableCell>
                                        <TableCell>{demand.amount}</TableCell>
                                        <TableCell>{demand.date.toLocaleDateString()}</TableCell>
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
