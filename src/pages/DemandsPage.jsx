import { useState, useEffect } from 'react'
import { Container, Typography, Paper, List, ListItem, ListItemText, Collapse, IconButton, Box } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import ExpandMore from '@mui/icons-material/ExpandMore'
import ExpandLess from '@mui/icons-material/ExpandLess'
import { useFirebase } from '../firebase/FirebaseContext'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'

function DemandsPage() {
  const navigate = useNavigate()
  const [userDemands, setUserDemands] = useState([])
  const [expandedUser, setExpandedUser] = useState(null)
  const [essencesData, setEssencesData] = useState({}) // State to hold essence data keyed by ID

  const { currentUser, loading, subscribeToDemands, subscribeToEssences } = useFirebase() // Add loading state
  const [users, setUsers] = useState({}) // State to hold user data

  // This useEffect handles the initial admin check and redirection for the whole page access.
  // It doesn't directly fetch data but ensures only admins can see the page content structure.
  useEffect(() => {
    if (!loading) { // Only check if not loading
      if (!currentUser || currentUser.role !== 'admin') {
        console.log('DemandsPage: Initial check - Not admin or not logged in, redirecting.');
        navigate('/home');
      }
    }
  }, [currentUser, loading, navigate]);

  // This useEffect was for subscribing to demands initially, but it's superseded by the one below
  // that also considers essencesData. We can comment it out or remove if the logic is fully covered.
  // useEffect(() => {
  //   if (!currentUser || currentUser.role !== 'admin') {
  //     // navigate('/home') // Already handled by the effect above
  //     return
  //   }
  //   const unsubscribe = subscribeToDemands(async (demands) => {
  //     const demandsMap = new Map()
  //     // ... (rest of the logic from the original first useEffect)
  //     setUserDemands(Array.from(demandsMap.values()))
  //   })
  //   return () => unsubscribe()
  // }, [currentUser]) // Dependency array might need adjustment if re-enabled

  // Subscribe to essences to get their totalDemand
  useEffect(() => {
    // Subscribe to users collection
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap = {};
      snapshot.forEach((doc) => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);
    });

    // Subscribe to essences
    const unsubscribeEssences = subscribeToEssences((essences) => {
      const essencesMap = essences.reduce((acc, essence) => {
        acc[essence.id] = essence;
        return acc;
      }, {});
      setEssencesData(essencesMap);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeEssences();
    };
  }, [subscribeToEssences]);

  // Process demands, filtering based on essence totalDemand
  useEffect(() => {
    // This is the primary effect for displaying demands, so admin check and loading state are critical here.
    if (loading) {
      // If still loading currentUser, don't do anything yet.
      // A loading indicator is returned at the end of the component function.
      return;
    }

    if (!currentUser || currentUser.role !== 'admin') {
      // navigate('/home'); // This should have been caught by the first useEffect.
      // If somehow an non-admin reaches here after loading, clear demands and don't subscribe.
      setUserDemands([]);
      return;
    }

    // Ensure essencesData is loaded before processing demands
    if (Object.keys(essencesData).length === 0) {
      // Still waiting for essences data, show loading or empty state for demands
      // setUserDemands([]); // Optionally clear demands until essences are ready
      return; // Wait for essences data
    }

    const unsubscribeDemands = subscribeToDemands((demands) => {
      const demandsMap = new Map()

      for (const demand of demands) {
        if (!demandsMap.has(demand.userId)) {
          const userData = users[demand.userId] || {};
          demandsMap.set(demand.userId, {
            userInfo: {
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'İsimsiz Kullanıcı',
              phone: userData.phone || 'Telefon bilgisi yok',
              city: userData.city || 'Şehir bilgisi yok',
              district: userData.district || 'İlçe bilgisi yok',
              neighborhood: userData.neighborhood || 'Mahalle bilgisi yok',
              address: userData.address || 'Adres bilgisi yok',
              email: userData.email || 'E-posta bilgisi yok'
            },
            demands: [],
            totalAmount: 0
          })
        }

        const userDemands = demandsMap.get(demand.userId)
        userDemands.demands.push({
          id: demand.id,
          essenceName: demand.essenceName,
          essenceCode: demand.essenceCode,
          amount: demand.amount,
          date: demand.createdAt.toDate(),
          price: demand.price,
          category: demand.category
        })
        userDemands.totalAmount += demand.amount
      }

      setUserDemands(Array.from(demandsMap.values()))
    })

    return () => unsubscribe()
  }, [currentUser])

  // Subscribe to essences to get their totalDemand
  useEffect(() => {
    const unsubscribeEssences = subscribeToEssences((essences) => {
      const essencesMap = essences.reduce((acc, essence) => {
        acc[essence.id] = essence;
        return acc;
      }, {});
      setEssencesData(essencesMap);
    });
    return () => unsubscribeEssences();
  }, [subscribeToEssences]);

  useEffect(() => { 
    if (loading || !currentUser || currentUser.role !== 'admin') { 
      return; 
    } 
  
    if (Object.keys(essencesData).length === 0 || Object.keys(users).length === 0) { 
      return; // users veya essencesData henüz gelmemiş 
    } 
  
    const unsubscribeDemands = subscribeToDemands((demands) => { 
      const demandsMap = new Map(); 
  
      for (const demand of demands) { 
        const essence = essencesData[demand.essenceId]; 
        if (!essence || essence.totalDemand < 250) { 
          continue; 
        } 
  
        const userData = users[demand.userId]; 
        if (!userData) { 
          console.warn("Eksik kullanıcı verisi:", demand.userId); 
          continue; 
        } 
  
        if (!demandsMap.has(demand.userId)) { 
          demandsMap.set(demand.userId, { 
            userInfo: { 
              name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'İsimsiz Kullanıcı', 
              phone: userData.phone || 'Telefon bilgisi yok', 
              city: userData.city || 'Şehir bilgisi yok', 
              district: userData.district || 'İlçe bilgisi yok', 
              neighborhood: userData.neighborhood || 'Mahalle bilgisi yok', 
              address: userData.address || 'Adres bilgisi yok', 
              email: userData.email || 'E-posta bilgisi yok', 
            }, 
            demands: [], 
            totalAmount: 0 
          }); 
        } 
  
        const userEntry = demandsMap.get(demand.userId); 
        const unitPrice = (demand.totalPrice && demand.amount) ? demand.totalPrice / demand.amount : 0; 
  
        userEntry.demands.push({ 
          id: demand.id, 
          essenceName: demand.essenceName, 
          essenceCode: demand.essenceCode, 
          amount: demand.amount, 
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date(), 
          unitPrice, 
          category: essence.category 
        }); 
  
        userEntry.totalAmount += unitPrice; 
      } 
  
      setUserDemands(Array.from(demandsMap.values())); 
    }); 
  
    return () => unsubscribeDemands(); 
  }, [currentUser, loading, subscribeToDemands, essencesData, users]);

  // const handleExpandClick = (userName) => { // This was the duplicate, removing it.
  //   setExpandedUser(expandedUser === userName ? null : userName)
  // }

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6">Loading page data...</Typography>
      </Container>
    );
  }

  // If not loading, but user is not an admin (e.g., role changed, or initial load determined no admin)
  // The first useEffect should have redirected, but this is a safeguard for rendering.
  if (!currentUser || currentUser.role !== 'admin') {
    // Content for non-admins or when currentUser is null after loading is handled by redirection.
    // Returning null here prevents rendering the admin-specific UI if redirection is pending or failed.
    return null;
  }

  const handleExpandClick = (userName) => {
    setExpandedUser(expandedUser === userName ? null : userName)
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" component="div" gutterBottom>
        Kesin Alım Talep Listesi
      </Typography>
      <List>
        {userDemands.map((userData) => (
          <Paper key={userData.userInfo.name} elevation={3} sx={{ mb: 2, overflow: 'hidden' }}>
            <ListItem
              button
              onClick={() => handleExpandClick(userData.userInfo.name)}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                bgcolor: 'background.paper'
              }}
            >
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <ListItemText
                    primary={userData.userInfo.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2" display="block">
                          {`📧 ${userData.userInfo.email}`}
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          {`📞 ${userData.userInfo.phone}`}
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          {`📍 ${userData.userInfo.city}, ${userData.userInfo.district}, ${userData.userInfo.neighborhood}`}
                        </Typography>
                        <Typography component="span" variant="body2" display="block">
                          {`🏠 ${userData.userInfo.address}`}
                        </Typography>
                      </>
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Paper elevation={1} sx={{ px: 2, py: 1, bgcolor: 'primary.main', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: 'primary.contrastText', fontWeight: 600 }}>
                      {/* Display calculated total amount */}
                      {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(userData.totalAmount)}
                    </Typography>
                  </Paper>
                  <IconButton edge="end">
                    {expandedUser === userData.userInfo.name ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>
            </ListItem>
            <Collapse in={expandedUser === userData.userInfo.name} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem sx={{ pl: 4, pr: 4, pt: 1, pb: 1, display: 'flex', flexDirection: 'row', gap: 2, borderBottom: '2px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="subtitle2" sx={{ flex: 2, fontWeight: 600 }}>
                    Esans Adı
                  </Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>
                    Kategori
                  </Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
                    Miktar
                  </Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>
                    Birim Fiyat
                  </Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>
                    Tarih
                  </Typography>
                </ListItem>
                {userData.demands
                  // Esans adına göre alfabetik sıralama
                  .sort((a, b) => a.essenceName.localeCompare(b.essenceName, 'tr-TR'))
                  .map((demand) => (
                  <ListItem key={demand.id} sx={{ pl: 4, pr: 4, pt: 1, pb: 1, display: 'flex', flexDirection: 'row', gap: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                    <Typography variant="body2" sx={{ flex: 2 }}>
                      {demand.essenceName} ({demand.essenceCode})
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {demand.category || '-'}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>
                      {demand.amount} gr
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>
                      {/* Display calculated unit price */}
                      {demand.unitPrice != null ? `${demand.unitPrice.toFixed(2)} TL/gr` : '-'}
                    </Typography>
                    <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>
                      {new Date(demand.date).toLocaleDateString('tr-TR')}
                    </Typography>
                  </ListItem>
                ))}
                <ListItem sx={{ pl: 4, pr: 4, pt: 2, pb: 2, bgcolor: 'primary.main', mt: 1, borderRadius: 1 }}>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="h6" 
                        sx={{ 
                          fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                          fontWeight: 600,
                          textAlign: 'right',
                          color: 'primary.contrastText'
                        }}
                      >
                        {/* Display calculated total amount */}
                        Toplam Tutar: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(userData.totalAmount)}
                      </Typography>
                    }
                  />
                </ListItem>
              </List>
            </Collapse>
          </Paper>
        ))}
      </List>
    </Container>
  )
}

export default DemandsPage