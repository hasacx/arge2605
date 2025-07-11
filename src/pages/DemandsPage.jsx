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
  const [essencesData, setEssencesData] = useState({})
  const { currentUser, loading, subscribeToDemands, subscribeToEssences } = useFirebase()
  const [users, setUsers] = useState({})

  useEffect(() => {
    if (!loading && (!currentUser || currentUser.role !== 'admin')) {
      navigate('/home');
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersMap = {};
      snapshot.forEach((doc) => {
        usersMap[doc.id] = doc.data();
      });
      setUsers(usersMap);
    });

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

  useEffect(() => {
    if (loading || !currentUser || currentUser.role !== 'admin') return;
    if (Object.keys(essencesData).length === 0 || Object.keys(users).length === 0) return;

    const unsubscribeDemands = subscribeToDemands((demands) => {
      const demandsMap = new Map();

      for (const demand of demands) {
        const essence = essencesData[demand.essenceId];
        if (!essence || essence.totalDemand < 250 || demand.totalDemandBefore === undefined) continue;

        const lastCompletedBucketIndex = Math.floor(essence.totalDemand / 250) - 1;
        const bucketStart = lastCompletedBucketIndex * 250;
        const bucketEnd = bucketStart + 250;

        const demandEnd = demand.totalDemandBefore + demand.amount;
        const includedAmount = demandEnd > bucketEnd
          ? bucketEnd - demand.totalDemandBefore
          : demand.amount;

        if (includedAmount <= 0 || demand.totalDemandBefore < bucketStart) continue;

        const userData = users[demand.userId];
        if (!userData) continue;

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
            totalAmount: 0,
          });
        }

        const userEntry = demandsMap.get(demand.userId);
        const unitPrice = (demand.totalPrice && demand.amount) ? demand.totalPrice / demand.amount : 0;

        userEntry.demands.push({
          id: demand.id,
          essenceName: demand.essenceName,
          essenceCode: demand.essenceCode,
          amount: includedAmount,
          date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date(),
          unitPrice,
          category: essence.category,
        });

        userEntry.totalAmount += includedAmount * unitPrice;
      }

      setUserDemands(Array.from(demandsMap.values()));
    });

    return () => unsubscribeDemands();
  }, [currentUser, loading, subscribeToDemands, essencesData, users]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="h6">Loading page data...</Typography>
      </Container>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  const handleExpandClick = (userName) => {
    setExpandedUser(expandedUser === userName ? null : userName);
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h5" component="div" gutterBottom>
        Kesin Alım Talep Listesi
      </Typography>
      <List>
        {userDemands.map((userData) => (
          <Paper key={userData.userInfo.name} elevation={3} sx={{ mb: 2, overflow: 'hidden' }}>
            <ListItem button onClick={() => handleExpandClick(userData.userInfo.name)}>
              <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ flex: 1 }}>
                  <ListItemText
                    primary={userData.userInfo.name}
                    secondary={
                      <>
                        <Typography variant="body2">📧 {userData.userInfo.email}</Typography>
                        <Typography variant="body2">📞 {userData.userInfo.phone}</Typography>
                        <Typography variant="body2">📍 {userData.userInfo.city}, {userData.userInfo.district}, {userData.userInfo.neighborhood}</Typography>
                        <Typography variant="body2">🏠 {userData.userInfo.address}</Typography>
                      </>
                    }
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Paper elevation={1} sx={{ px: 2, py: 1, bgcolor: 'primary.main', borderRadius: 1 }}>
                    <Typography variant="subtitle1" sx={{ color: 'primary.contrastText', fontWeight: 600 }}>
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
                <ListItem sx={{ pl: 4, pr: 4, pt: 1, pb: 1, display: 'flex', gap: 2, borderBottom: '2px solid rgba(0, 0, 0, 0.12)' }}>
                  <Typography variant="subtitle2" sx={{ flex: 2, fontWeight: 600 }}>Esans Adı</Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, fontWeight: 600 }}>Kategori</Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>Miktar</Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'center', fontWeight: 600 }}>Birim Fiyat</Typography>
                  <Typography variant="subtitle2" sx={{ flex: 1, textAlign: 'right', fontWeight: 600 }}>Tarih</Typography>
                </ListItem>
                {userData.demands
                  .sort((a, b) => a.essenceName.localeCompare(b.essenceName, 'tr-TR'))
                  .map((demand) => (
                    <ListItem key={demand.id} sx={{ pl: 4, pr: 4, pt: 1, pb: 1, display: 'flex', gap: 2, borderBottom: '1px solid rgba(0, 0, 0, 0.12)' }}>
                      <Typography variant="body2" sx={{ flex: 2 }}>{demand.essenceName} ({demand.essenceCode})</Typography>
                      <Typography variant="body2" sx={{ flex: 1 }}>{demand.category || '-'}</Typography>
                      <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>{demand.amount} gr</Typography>
                      <Typography variant="body2" sx={{ flex: 1, textAlign: 'center' }}>{demand.unitPrice?.toFixed(2)} TL/gr</Typography>
                      <Typography variant="body2" sx={{ flex: 1, textAlign: 'right' }}>{new Date(demand.date).toLocaleDateString('tr-TR')}</Typography>
                    </ListItem>
                ))}
              </List>
            </Collapse>
          </Paper>
        ))}
      </List>
    </Container>
  );
}

export default DemandsPage;
