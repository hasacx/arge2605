import React, { useState, useEffect, useRef } from 'react'; // useRef'i ekledik
import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Card, CardContent, IconButton, Snackbar } from '@mui/material';
import { Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, LocationOn as LocationIcon, LocationCity as LocationCityIcon, Home as HomeIcon, Delete as DeleteIcon } from '@mui/icons-material';
import MuiAlert from '@mui/material/Alert';

function ProfilePage() {
  const { currentUser, deleteDemand, subscribeToDemands, subscribeToEssences } = useFirebase();

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
  const essencesMapRef = useRef({}); // Esansları useRef ile tutuyoruz, böylece bağımlılık döngüsüne girmez
  const [loading, setLoading] = useState(true);

  // Kullanıcı bilgileri için useEffect
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

  // Talepleri ve Esansları dinlemek için ana useEffect
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let unsubscribeEssences;
    let unsubscribeDemands;

    setLoading(true);

    // 1. Esansları dinlemeye başla
    unsubscribeEssences = subscribeToEssences((updatedEssences) => {
      // useRef'i güncelleyelim, böylece diğer callback'ler en yeni verilere erişebilir
      essencesMapRef.current = updatedEssences.reduce((acc, essence) => {
        acc[essence.id] = essence;
        return acc;
      }, {});

      // Essences güncellendiğinde talepleri de tetikleyelim,
      // böylece mevcut demands state'i de güncel essence fiyatlarıyla yeniden hesaplanır.
      // Bu, `setDemands`'i doğrudan bu callback içinde çağırarak olur,
      // çünkü `unsubscribeDemands` zaten tüm talepleri yeniden çekecektir.
      // Ancak buradaki temel amaç, `essencesMapRef.current`'i güncelleyip,
      // `demands` callback'inin sonraki çalışmasını doğru verilerle yapmasını sağlamaktır.
      // Ya da direkt burada demands state'ini güncelleyebiliriz:
      setDemands((prevDemands) =>
        prevDemands.map((demand) => {
          const essence = essencesMapRef.current[demand.essenceId];
          if (essence) {
            const calculatedTotalPrice = demand.amount * essence.price;
            return {
              ...demand,
              totalPrice: calculatedTotalPrice,
            };
          }
          return demand;
        })
      );
    });

    // 2. Talepleri dinlemeye başla
    unsubscribeDemands = subscribeToDemands((allDemands) => {
      const userDemands = allDemands.filter(d => d.userId === currentUser.uid);

      // Talepler geldiğinde ve essencesMapRef güncel olduğunda fiyatları hesapla
      const updatedUserDemands = userDemands.map(demand => {
        const essence = essencesMapRef.current[demand.essenceId]; // useRef ile güncel esansları al
        let calculatedTotalPrice = 0;

        if (essence) {
          calculatedTotalPrice = demand.amount * essence.price;
        } else {
          // Eğer esans bilgisi henüz yoksa veya bulunamadıysa,
          // mevcut totalPrice değerini kullan (daha önce kaydedilmiş hali)
          calculatedTotalPrice = parseFloat(demand.totalPrice) || 0;
        }

        return {
          ...demand,
          createdAt: demand.createdAt?.toDate ? demand.createdAt.toDate() : demand.createdAt,
          totalPrice: calculatedTotalPrice,
        };
      }).sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
        return dateB - dateA;
      });

      setDemands(updatedUserDemands);
      setLoading(false);
    });

    // Cleanup fonksiyonu: Component unmount olduğunda abonelikleri temizle
    return () => {
      if (unsubscribeEssences) unsubscribeEssences();
      if (unsubscribeDemands) unsubscribeDemands();
    };
  }, [currentUser, subscribeToDemands, subscribeToEssences]); // essencesMapRef bağımlılıklara eklenmiyor

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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Yükleniyor...</Typography>
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
                    <TableCell>Toplam Fiyat</TableCell>
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
