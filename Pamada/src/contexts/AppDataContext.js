import React, { createContext, useContext, useMemo, useState } from 'react';

const AppDataContext = createContext(null);

const placeholderScans = [
  {
    id: 1,
    plantName: 'Plot A - Plant 001',
    date: '2026-02-06',
    time: '09:20 AM',
    status: 'healthy',
    maturity: '86%',
    maturityPercent: 86,
    image: 'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=300&q=80',
    diseases: [],
  },
  {
    id: 2,
    plantName: 'Plot A - Plant 002',
    date: '2026-02-06',
    time: '11:05 AM',
    status: 'leaf_spot',
    maturity: '72%',
    maturityPercent: 72,
    image: 'https://images.unsplash.com/photo-1444392061186-9fc38f84f726?auto=format&fit=crop&w=300&q=80',
    diseases: ['Leaf Spot'],
  },
  {
    id: 3,
    plantName: 'Plot B - Plant 014',
    date: '2026-02-05',
    time: '03:42 PM',
    status: 'ready',
    maturity: '94%',
    maturityPercent: 94,
    image: 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=300&q=80',
    diseases: [],
  },
  {
    id: 4,
    plantName: 'Plot C - Plant 021',
    date: '2026-02-05',
    time: '10:05 AM',
    status: 'root_rot',
    maturity: '48%',
    maturityPercent: 48,
    image: 'https://images.unsplash.com/photo-1461354464878-ad92f492a5a0?auto=format&fit=crop&w=300&q=80',
    diseases: ['Root Rot'],
  },
];

const placeholderStats = [
  { label: 'Total Scans', value: '158', icon: 'camera', tone: 'primary' },
  { label: 'Healthy Plants', value: '96', icon: 'checkmark-circle', tone: 'success' },
  { label: 'At Risk', value: '14', icon: 'warning', tone: 'warning' },
  { label: 'Ready to Harvest', value: '48', icon: 'leaf', tone: 'successDark' },
];

export function AppDataProvider({ children }) {
  const [scans, setScans] = useState(placeholderScans);

  const addScan = (scan) => {
    setScans((prev) => [{ ...scan, id: Date.now() }, ...prev]);
  };

  const value = useMemo(
    () => ({
      scans,
      stats: placeholderStats,
      recentScans: scans.slice(0, 4),
      analytics: {
        totalPlants: 164,
        harvestRate: '79%',
        diseaseRate: '9%',
        avgMaturity: '77%',
        prediction: '46 plants ready in 2 weeks',
        growthNote: 'Growth rate is steady across Plot A and B.',
      },
      dailyTip:
        'Use morning light for scanning. It improves leaf texture contrast and model confidence.',
      addScan,
    }),
    [scans]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}