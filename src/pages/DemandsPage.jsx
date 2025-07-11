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

      // Gerekli veriler yoksa geç
      if (!essence || demand.totalDemandBefore === undefined) {
        continue;
      }

      // Toplam tamamlanan 250gr'lık dilimi bul
      const completedBuckets = Math.floor(essence.totalDemand / 250);
      const displayThreshold = completedBuckets * 250;

      // Eğer bu talep tamamen dışarıda kalıyorsa geç
      if (demand.totalDemandBefore >= displayThreshold) {
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

      // Talep miktarının ne kadarının dahil edileceğini belirle
      const demandEnd = demand.totalDemandBefore + demand.amount;
      const includedAmount = demandEnd > displayThreshold
        ? displayThreshold - demand.totalDemandBefore
        : demand.amount;

      // Eğer dahil edilecek miktar 0 veya negatifse atla
      if (includedAmount <= 0) {
        continue;
      }

      const partialPrice = unitPrice * includedAmount;

      userEntry.demands.push({ 
        id: demand.id, 
        essenceName: demand.essenceName, 
        essenceCode: demand.essenceCode, 
        amount: includedAmount, 
        date: demand.createdAt?.toDate ? demand.createdAt.toDate() : new Date(), 
        unitPrice, 
        category: essence.category 
      }); 

      userEntry.totalAmount += partialPrice; 
    } 

    setUserDemands(Array.from(demandsMap.values())); 
  }); 

  return () => unsubscribeDemands(); 
}, [currentUser, loading, subscribeToDemands, essencesData, users]);
