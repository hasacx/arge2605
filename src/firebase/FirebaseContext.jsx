import { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from './config';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  increment,
  getDoc
} from 'firebase/firestore';

const FirebaseContext = createContext();

export const useFirebase = () => {
  return useContext(FirebaseContext);
};

const createDefaultAdminIfNeeded = async () => {
  const adminEmail = "admin@admin.com";
  const adminPassword = "951623"; 
  const usersRef = collection(db, "users");
  const q = query(usersRef, where("email", "==", adminEmail));

  try {
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      console.log("Default admin user not found, creating one...");
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          email: user.email,
          role: "admin",
          firstName: "Admin",
          lastName: "User",
        });
        console.log("Default admin user created successfully and added to Firestore with admin role.");
      } catch (authError) {
        if (authError.code === 'auth/email-already-in-use') {
          console.log("Admin email already exists in Firebase Auth. Checking Firestore document...");
          const existingUserQuery = query(collection(db, "users"), where("email", "==", adminEmail));
          const existingUserSnapshot = await getDocs(existingUserQuery);
          if (!existingUserSnapshot.empty) {
            const existingUserDoc = existingUserSnapshot.docs[0];
            if (existingUserDoc.data().role !== 'admin') {
              console.log("Admin user exists in Auth, updating role in Firestore to 'admin'.");
              await updateDoc(doc(db, "users", existingUserDoc.id), { role: "admin" });
            }
          }
        } else {
          console.error("Error creating default admin user in Firebase Auth:", authError);
          if (authError.code) {
            console.error(`FirebaseError Code (Auth): ${authError.code}, Message: ${authError.message}`);
          }
        }
      }
    } else {
      const adminDoc = querySnapshot.docs[0];
      if (adminDoc.data().role !== 'admin') {
        console.log("Admin user document found in Firestore, but role is not 'admin'. Updating role...");
        await updateDoc(doc(db, "users", adminDoc.id), { role: "admin" });
        console.log("Admin user role updated to 'admin' in Firestore.");
      }
    }
  } catch (error) {
    console.error("Error in createDefaultAdminIfNeeded:", error);
    if (error.code) {
      console.error(`FirebaseError Code: ${error.code}, Message: ${error.message}`);
    }
  }
};

export const FirebaseProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    createDefaultAdminIfNeeded();
    let unsubscribeUserDoc = () => {};

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribeUserDoc();
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data();
            const role = userData.role || 'user';
            setCurrentUser({ uid: user.uid, email: user.email, ...userData, role });
          } else {
            setCurrentUser({ uid: user.uid, email: user.email, role: 'user' });
            console.error("User document not found in Firestore for UID:", user.uid, "Assigning default 'user' role.");
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user document:", error);
          setCurrentUser({ uid: user.uid, email: user.email, role: 'user' });
          setLoading(false);
        });
      } else {
        unsubscribeUserDoc();
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeUserDoc();
    };
  }, []);

  const register = async (email, password, userData) => {
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      const userDocRef = doc(db, 'users', user.uid);
      await setDoc(userDocRef, {
        email: email,
        ...userData,
        role: 'user'
      });
      return user;
    } catch (error) {
      throw error;
    }
  };

  const login = async (email, password) => {
    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    // localStorage'dan kullanıcı bilgilerini temizle
    localStorage.removeItem('currentUser');
    setCurrentUser(null);
    // Firebase oturumunu da kapat (şu an devre dışı)
    // return signOut(auth);
    return Promise.resolve();
  };

  const updateUser = async (userId, userData) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, userData);
    } catch (error) {
      throw error;
    }
  };

  const getUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  };

  const deleteUser = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      // Note: This only deletes the user from Firestore, not from Firebase Authentication.
    } catch (error) {
      console.error("Error deleting user from Firestore:", error);
      throw error;
    }
  };
  
  const addEssence = async (essenceData) => {
    try {
      await addDoc(collection(db, 'essences'), essenceData);
    } catch (error) {
      throw error;
    }
  };

  const updateEssence = async (id, essenceData) => {
    try {
      const essenceRef = doc(db, 'essences', id);
      await updateDoc(essenceRef, essenceData);
    } catch (error) {
      throw error;
    }
  };

  const deleteEssence = async (essenceId) => {
    try {
      // 1. Find all demands associated with this essenceId
      const demandsQuery = query(collection(db, 'demands'), where('essenceId', '==', essenceId));
      const demandsSnapshot = await getDocs(demandsQuery);

      // 2. Delete each associated demand
      // For a large number of demands, consider using a batched write or a Cloud Function for better performance and atomicity.
      const deletePromises = [];
      demandsSnapshot.forEach((demandDoc) => {
        deletePromises.push(deleteDoc(doc(db, 'demands', demandDoc.id)));
      });
      await Promise.all(deletePromises);
      console.log(`Successfully deleted ${deletePromises.length} associated demands for essence ${essenceId}.`);

      // 3. Delete the essence itself
      const essenceRef = doc(db, 'essences', essenceId);
      await deleteDoc(essenceRef);
      console.log(`Successfully deleted essence ${essenceId}.`);

    } catch (error) {
      console.error(`Error deleting essence ${essenceId} and/or its associated demands:`, error);
      throw error;
    }
  };
  
  const deleteManyEssences = async (essenceIds) => {
    try {
      // Toplu silme işlemi için
      const results = [];
      
      // Her bir esans için silme işlemini gerçekleştir
      for (const essenceId of essenceIds) {
        try {
          // 1. Bu esans ID'sine sahip tüm talepleri bul
          const demandsQuery = query(collection(db, 'demands'), where('essenceId', '==', essenceId));
          const demandsSnapshot = await getDocs(demandsQuery);

          // 2. Her bir talebi sil
          const deletePromises = [];
          demandsSnapshot.forEach((demandDoc) => {
            deletePromises.push(deleteDoc(doc(db, 'demands', demandDoc.id)));
          });
          await Promise.all(deletePromises);
          
          // 3. Esansı sil
          const essenceRef = doc(db, 'essences', essenceId);
          await deleteDoc(essenceRef);
          
          results.push({ id: essenceId, success: true });
          console.log(`Successfully deleted essence ${essenceId} and ${deletePromises.length} associated demands.`);
        } catch (error) {
          results.push({ id: essenceId, success: false, error: error.message });
          console.error(`Error deleting essence ${essenceId}:`, error);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      throw error;
    }
  };

  const getEssences = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'essences'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  };

  const addDemand = async (essenceId, demandData) => {
    try {
      if (!currentUser) {
        throw new Error("Kullanıcı girişi yapılmamış veya kullanıcı bilgileri yüklenemedi.");
      }
      const essenceRef = doc(db, 'essences', essenceId);
      const essenceDocSnap = await getDoc(essenceRef);
      if (!essenceDocSnap.exists()) {
        throw new Error("Talep edilen esans bulunamadı.");
      }
      const essenceData = essenceDocSnap.data();
      await addDoc(collection(db, 'demands'), {
        essenceId,
        userId: currentUser.uid,
        userName: `${currentUser.firstName || 'Bilinmeyen'} ${currentUser.lastName || 'Kullanıcı'}`,
        essenceName: essenceData.name,
        essenceCode: essenceData.code,
        ...demandData,
        createdAt: new Date()
      });
      const newTotalDemand = (essenceData.totalDemand || 0) + (demandData.amount || 0);
      await updateDoc(essenceRef, { totalDemand: newTotalDemand });
    } catch (error) {
      console.error("Error in addDemand:", error);
      throw error;
    }
  };

  const deleteDemand = async (demandId) => {
    try {
      const demandRef = doc(db, 'demands', demandId);
      const demandDocSnap = await getDoc(demandRef); // Use getDoc for a single document

      if (demandDocSnap.exists()) {
        const demandData = demandDocSnap.data();
        
        // Attempt to update essence totalDemand
        const essenceRef = doc(db, 'essences', demandData.essenceId);
        await updateDoc(essenceRef, { 
          totalDemand: increment(-(demandData.amount || 0))
        });
        // Note: This update will likely fail for non-admin users due to current Firestore security rules
        // for the 'essences' collection, which typically restrict updates to admins.
        // A Firebase Cloud Function triggered on demand deletion is the recommended approach
        // to reliably and securely update totalDemand.
        
        await deleteDoc(demandRef); // This should now succeed for demand owners.
      } else {
        console.error(`Demand with ID ${demandId} not found.`);
        throw new Error("Silinecek talep bulunamadı.");
      }
    } catch (error) {
      console.error("Error deleting demand:", error);
      throw error;
    }
  };

  const getUserDemands = async (userId) => {
    try {
      const q = query(collection(db, 'demands'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw error;
    }
  };

  const subscribeToEssences = (callback) => {
    return onSnapshot(collection(db, 'essences'), (snapshot) => {
      const essences = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(essences);
    });
  };

  const subscribeToDemands = (callback) => {
    return onSnapshot(collection(db, 'demands'), (snapshot) => {
      const demands = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(demands);
    });
  };

  const value = {
    currentUser,
    register,
    login,
    logout,
    updateUser,
    getUsers,
    deleteUser,
    addEssence,
    updateEssence,
    deleteEssence,
    deleteManyEssences,
    getEssences,
    addDemand,
    getUserDemands,
    deleteDemand,
    subscribeToEssences,
    subscribeToDemands
  };

  return (
    <FirebaseContext.Provider value={value}>
      {!loading && children}
    </FirebaseContext.Provider>
  );
};