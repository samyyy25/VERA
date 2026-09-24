import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole, UserProfile } from '../types';

export const ROLE_PROFILES: Record<UserRole, UserProfile> = {
  citizen: {
    role: 'citizen',
    name: 'Priya Sharma',
    title: 'Citizen Eyewitness / Reporter',
    department: 'Public / Commuter',
    avatarInitials: 'PS',
  },
  police: {
    role: 'police',
    name: 'Inspector R. Verma',
    title: 'Patrol Unit 08 & Tactical Lead',
    badgeNumber: 'UP-POL-8841',
    department: 'Police Emergency Control Room',
    avatarInitials: 'RV',
  },
  hospital: {
    role: 'hospital',
    name: 'Dr. Ananya Sen',
    title: 'Trauma & EMS Dispatch Lead',
    badgeNumber: 'KGMU-ER-102',
    department: 'Emergency Trauma & Ambulance Services',
    avatarInitials: 'AS',
  },
  municipal: {
    role: 'municipal',
    name: 'Er. S. Kumar',
    title: 'Divisional Infrastructure Officer',
    badgeNumber: 'LMC-ENG-419',
    department: 'Municipal Corporation — Works & Civic Dept',
    avatarInitials: 'SK',
  },
};

interface RoleContextType {
  currentRole: UserRole;
  currentUserProfile: UserProfile;
  setRole: (role: UserRole) => void;
  canApprovePolice: () => boolean;
  canApproveHospital: () => boolean;
  canApproveMunicipal: () => boolean;
  canReport: () => boolean;
  isAuthority: () => boolean;
  allProfiles: Record<UserRole, UserProfile>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('vera_current_role') as UserRole;
    return saved && ROLE_PROFILES[saved] ? saved : 'police';
  });

  useEffect(() => {
    localStorage.setItem('vera_current_role', currentRole);
  }, [currentRole]);

  const currentUserProfile = ROLE_PROFILES[currentRole];

  const canApprovePolice = () => currentRole === 'police';
  const canApproveHospital = () => currentRole === 'hospital';
  const canApproveMunicipal = () => currentRole === 'municipal';
  const canReport = () => true;
  const isAuthority = () => currentRole !== 'citizen';

  return (
    <RoleContext.Provider
      value={{
        currentRole,
        currentUserProfile,
        setRole: setCurrentRole,
        canApprovePolice,
        canApproveHospital,
        canApproveMunicipal,
        canReport,
        isAuthority,
        allProfiles: ROLE_PROFILES,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = (): RoleContextType => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
};
