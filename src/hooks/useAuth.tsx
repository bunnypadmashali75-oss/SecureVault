import { useState, useEffect, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, setDoc, collection, addDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  profile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, profile: null });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Fetch user profile
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setProfile(userDoc.data());
        } else {
          // Initialize profile
          const newProfile = {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0],
            createdAt: new Date().toISOString(),
            securityScore: 100,
          };
          await setDoc(userRef, newProfile);
          setProfile(newProfile);
        }

        // Log login activity
        try {
          const res = await fetch('/api/log-activity', { method: 'POST' });
          const activityMeta = await res.json();
          
          const path = `users/${user.uid}/activity`;
          try {
            await addDoc(collection(db, path), {
              userId: user.uid,
              timestamp: activityMeta.timestamp,
              ip: activityMeta.ip,
              userAgent: activityMeta.userAgent,
              status: 'success',
              deviceType: 'Web Browser'
            });
          } catch (e) {
            handleFirestoreError(e, OperationType.CREATE, path);
          }
        } catch (e) {
          console.error("Activity logging failed", e);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, profile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
