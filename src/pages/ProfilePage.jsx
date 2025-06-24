import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Card, CardContent, IconButton, Snackbar } from '@mui/material';
import { Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, LocationOn as LocationIcon, LocationCity as LocationCityIcon, Home as HomeIcon, Delete as DeleteIcon } from '@mui/icons-material';
import MuiAlert from '@mui/material/Alert';

function ProfilePage() {
  const { currentUser, getUserDemands, deleteDemand, subscribeToDemands, subscribeToEssences } = useFirebase(); // updateDemand kaldırıldı, çünkü artık talepleri Firebase'de güncellemiyoruz

  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    neighborhood: '',
    address: ''
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [demands, setDemands] = useState([]);
  const [essencesMap, setEssencesMap] = useState({}); // Esansları hızlı erişim için map olarak tutacağız
  const [loading, setLoading] = useState(true); // Yüklenme durumu için state

  useEffect(() => {
    if (currentUser) {
      setUserInfo({
        firstName: currentUser.firstName || '',
        lastName: currentUser.lastName || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        city: currentUser.city || '',
        district: currentUser.district || '',
        neighborhood: currentUser.neighborhood || '',
        address: currentUser.address || ''
      });
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribeEssences;
    let unsubscribeDemands;

    // Tüm veri yükleme ve senkronizasyon işlemlerini tek bir useEffect içinde yönetiyoruz
    const setupListeners = async () => {
      setLoading(true);

      // 1. Esansları dinlemeye başla (öncelikli olarak esans fiyatlarına ihtiyacımız var)
      unsubscribeEssences = subscribeToEssences((updatedEssences) => {
        const newEssencesMap = updatedEssences.reduce((acc, essence) => {
          acc[essence.id] = essence;
          return acc;
        }, {});
        setEssencesMap(newEssencesMap); // Esanslar güncellendiğinde map'i güncelle
        
        // Esanslar güncellendiğinde, mevcut taleplerin fiyatlarını da yeniden hesapla
        // Bu, fiyatlar değiştiğinde tablonun otomatik güncellenmesini sağlar
        setDemands((prevDemands) =>
          prevDemands.map((demand) => {
            const essence = newEssencesMap[demand.essenceId];
            if (essence) {
              // demand.amount * essence.price yaparak toplam tutarı hesaplıyoruz
              const calculatedTotalPrice = demand.amount * essence.price;
              return {
                ...demand,
                totalPrice: calculatedTotalPrice, // Talebin toplam fiyatını güncelle
              };
            }
            return demand;
          })
        );
      });

      // 2. Talepleri dinlemeye başla
      unsubscribeDemands = subscribeToDemands((allDemands) => {
        const userDemands = allDemands.filter(d => d.userId === currentUser.uid);

        // Talepler geldiğinde, elimizdeki güncel esans bilgileriyle (essencesMap) fiyatları hesapla
        // Bu, yeni talepler eklendiğinde veya mevcut talepler değiştiğinde doğru fiyatları gösterir
        const updatedUserDemands = userDemands.map(demand => {
          const essence = essencesMap[demand.essenceId]; // Güncel esans map'ini kullan
          let calculatedTotalPrice = 0;

          if (essence) {
            calculatedTotalPrice = demand.amount * essence.price;
          } else {
            // Eğer esans bilgisi henüz yüklenmediyse veya bulunamadıysa,
            // mevcut totalPrice değerini kullan (güvenli bir fallback)
            calculatedTotalPrice = parseFloat(demand.totalPrice) || 0;
          }
          
          return {
            ...demand,
            // createdAt bir Firebase Timestamp objesi olabilir, Date objesine çeviriyoruz.
            createdAt: demand.createdAt?.toDate ? demand.createdAt.toDate() : demand.createdAt,
            totalPrice: calculatedTotalPrice,
          };
        }).sort((a, b) => {
          // Tarihleri Date objesi olarak karşılaştır
          const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
          const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
          return dateB - dateA; // En yeni tarihten eskiye doğru sırala
        });

        setDemands(updatedUserDemands);
        setLoading(false); // Veri yükleme tamamlandı
      });
    };

    setupListeners(); // Dinleyicileri başlat

    // Component unmount olduğunda abonelikleri temizle
    return () => {
      if (unsubscribeEssences) unsubscribeEssences();
      if (unsubscribeDemands) unsubscribeDemands();
    };
  }, [currentUser, subscribeToDemands, subscribeToEssences, essencesMap]); // essencesMap bağımlılığı önemli!

  const handleDemandDelete = async (demandToDelete) => {
    try {
      await deleteDemand(demandToDelete.id);
      setSnackbar({
        open: true,
        message: 'Talep başarıyla iptal edildi',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Talep silinirken bir hata oluştu',
        severity: 'error'
      });
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Yükleme durumu veya kullanıcı yoksa gösterilecek UI
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Yükleniyor...</Typography> {/* Basit bir yükleme mesajı */}
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">Giriş yapmalısınız.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: '100%', p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card elevation={2} sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" component="div" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <PersonIcon sx={{ mr: 1, fontSize: 20 }} />
                Profil Bilgilerim
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PersonIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.firstName} {userInfo.lastName}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.email}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <PhoneIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.phone}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationCityIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.city}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.district}, {userInfo.neighborhood}
                  </Typography>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <HomeIcon sx={{ mr: 1, fontSize: 16 }} />
                    {userInfo.address}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, mt: 2 }}>
            <Typography variant="h5" component="div">
              Talep Geçmişim
            </Typography>
          </Box>
          <Paper elevation={3}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '4px 4px 0 0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                Toplam Tutar: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                  demands.reduce((total, demand) => total + (parseFloat(demand.totalPrice) || 0), 0)
                )}
              </Typography>
            </Box>
            <TableContainer component={Paper} sx={{ mt: 0 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Esans</TableCell>
                    <TableCell>Miktar</TableCell>
                    <TableCell>Tarih</TableCell>
                    <TableCell>Toplam Fiyat</TableCell> {/* Başlık güncellendi */}
                    <TableCell>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {demands.map((demand) => (
                    <TableRow key={demand.id}>
                      <TableCell>{demand.essenceName}</TableCell>
                      <TableCell>{demand.amount} gr</TableCell>
                      <TableCell>
                        {demand.createdAt ? new Date(demand.createdAt).toLocaleDateString('tr-TR') : 'Bilinmiyor'}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                          parseFloat(demand.totalPrice) || 0
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleDemandDelete(demand)}
                          color="error"
                          size="small"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <MuiAlert
          elevation={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  );
}

export default ProfilePage;
