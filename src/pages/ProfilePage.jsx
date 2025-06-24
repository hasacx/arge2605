import { useState, useEffect } from 'react'
import { Box, Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Grid, Card, CardContent, IconButton, Snackbar, Checkbox, Button } from '@mui/material'
import { useFirebase } from '../firebase/FirebaseContext'
import { Person as PersonIcon, Phone as PhoneIcon, Email as EmailIcon, LocationOn as LocationIcon, LocationCity as LocationCityIcon, Home as HomeIcon, Delete as DeleteIcon, Autorenew as AutorenewIcon } from '@mui/icons-material'
import MuiAlert from '@mui/material/Alert'

function ProfilePage() {
  const { currentUser, getUserDemands, deleteDemand, subscribeToDemands, subscribeToEssences } = useFirebase()

  const [userInfo, setUserInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    district: '',
    neighborhood: '',
    address: ''
  })

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  const [demands, setDemands] = useState([])
  const [essences, setEssences] = useState([])

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
      })
    }
  }, [currentUser])

  useEffect(() => {
    const fetchDemands = async () => {
      if (currentUser) {
        try {
          const userDemands = await getUserDemands(currentUser.uid)
          setDemands(userDemands.sort((a, b) => {
            const nameComparison = a.essenceName.localeCompare(b.essenceName, 'tr-TR')
            if (nameComparison !== 0) return nameComparison
            return b.createdAt - a.createdAt
          }))
        } catch (error) {
          console.error('Talepler yüklenirken hata oluştu:', error)
        }
      }
    }
    fetchDemands()
  }, [currentUser])

  useEffect(() => {
    if (!currentUser) return
    const unsubscribeDemands = subscribeToDemands((allDemands) => {
      const userDemands = allDemands.filter(d => d.userId === currentUser.uid)
      setDemands(userDemands.sort((a, b) => {
        const nameComparison = a.essenceName.localeCompare(b.essenceName, 'tr-TR')
        if (nameComparison !== 0) return nameComparison
        return b.createdAt - a.createdAt
      }))
    })
    return () => unsubscribeDemands()
  }, [currentUser, subscribeToDemands])

  useEffect(() => {
    const unsubscribeEssences = subscribeToEssences((updatedEssences) => {
      setEssences(updatedEssences)
    })
    return () => unsubscribeEssences()
  }, [subscribeToEssences])

  const handleRefreshPrices = async () => {
    try {
      // Talepleri güncel esans fiyatlarıyla güncelle
      const updatedDemands = demands.map(demand => {
        const essence = essences.find(e => e.id === demand.essenceId)
        if (essence) {
          return {
            ...demand,
            totalPrice: demand.amount * essence.price // Güncel fiyatla totalPrice hesapla
          }
        }
        return demand
      })
      setDemands(updatedDemands.sort((a, b) => {
        const nameComparison = a.essenceName.localeCompare(b.essenceName, 'tr-TR')
        if (nameComparison !== 0) return nameComparison
        return b.createdAt - a.createdAt
      }))
      setSnackbar({
        open: true,
        message: 'Fiyatlar başarıyla güncellendi',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Fiyatlar güncellenirken bir hata oluştu',
        severity: 'error'
      })
    }
  }

  const handleDemandDelete = async (demandToDelete) => {
    try {
      await deleteDemand(demandToDelete.id)
      setDemands(prevDemands => prevDemands.filter(demand => demand.id !== demandToDelete.id))
      setSnackbar({
        open: true,
        message: 'Talep başarıyla iptal edildi',
        severity: 'success'
      })
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Talep silinirken bir hata oluştu',
        severity: 'error'
      })
    }
  }

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false })
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
            <Button
              variant="outlined"
              onClick={handleRefreshPrices}
              startIcon={<AutorenewIcon />}
            >
              Fiyatları Yenile
            </Button>
          </Box>
          <Paper elevation={3}>
            <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: '4px 4px 0 0' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, textAlign: 'right' }}>
                Toplam Tutar: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                  demands.reduce((total, demand) => total + (demand.totalPrice || 0), 0)
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
                    <TableCell>Tutar</TableCell>
                    <TableCell>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {demands.map((demand) => (
                    <TableRow key={demand.id}>
                      <TableCell>{demand.essenceName}</TableCell>
                      <TableCell>{demand.amount} gr</TableCell>
                      <TableCell>
                        {new Date(demand.createdAt).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(
                          demand.totalPrice || 0
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
 eviction={6}
          variant="filled"
          severity={snackbar.severity}
          onClose={handleSnackbarClose}
        >
          {snackbar.message}
        </MuiAlert>
      </Snackbar>
    </Box>
  )
}

export default ProfilePage
