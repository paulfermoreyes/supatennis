'use client';

import React, { useState } from 'react';
import { useRacquetCustomizer } from './hooks/useRacquetCustomizer';
import { useMatchPlanner } from './hooks/useMatchPlanner';
import { useAuth } from './hooks/useAuth';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ExplanationPanel } from './components/ExplanationPanel';
import { RacquetCustomizer } from './components/RacquetCustomizer';
import { MatchPlanner } from './components/MatchPlanner';
import { AuthModal } from './components/AuthModal';

export default function SwingweightCalculator() {
  const [activeTab, setActiveTab] = useState<'customizer' | 'planner'>('customizer');
  const [showExplanation, setShowExplanation] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null);

  const auth = useAuth();
  const customizer = useRacquetCustomizer();
  const planner = useMatchPlanner({
    currentUser: auth.currentUser,
    registeredUsers: auth.users
  });

  return (
    <div className="flex-1 bg-white flex flex-col justify-between selection:bg-wimbledon-green-light selection:text-wimbledon-green">
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        showExplanation={showExplanation}
        setShowExplanation={setShowExplanation}
        isCloudSynced={planner.isCloudSynced}
        onResetTuner={customizer.resetAll}
        currentUser={auth.currentUser}
        onLogout={auth.logout}
        onOpenLogin={() => setShowAuthModal('login')}
        onOpenRegister={() => setShowAuthModal('register')}
      />
      
      <ExplanationPanel showExplanation={showExplanation} />
      
      <main className="flex-1 bg-white">
        {activeTab === 'customizer' ? (
          <RacquetCustomizer customizer={customizer} />
        ) : (
          <MatchPlanner 
            planner={planner} 
            currentUser={auth.currentUser}
            registeredUsers={auth.users}
            onOpenLogin={() => setShowAuthModal('login')}
          />
        )}
      </main>

      <Footer />

      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(null)}
        onLogin={auth.login}
        onRegister={auth.register}
      />
    </div>
  );
}

