import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from './firebase';
import { ensureUserProfile, type OperationalRole } from './services/legalBdService';
import type {
  AuditLog,
  CaseReferral,
  CommitteeMeeting,
  Complaint,
  IntakeChannel,
  LanguageCode,
  LegalCase,
  MediationSession,
  UserPublic,
} from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LandingView } from './components/LandingView';
import { WorkspaceShell, type WorkspaceTab } from './components/WorkspaceShell';
import { ApplicationWizard } from './components/ApplicationWizard';
import { UssdHelplineModal } from './components/UssdHelplineModal';
import { CaseDetailDrawer } from './components/CaseDetailDrawer';
import { AuthModal, AuthPageView, getWorkspaceTabForRole, type AuthModalMode } from './components/AuthModal';

interface HasTimestamps {
  updatedAt?: { toMillis?: () => number } | null;
  createdAt?: { toMillis?: () => number } | null;
}

function sortByTimestampDesc<T extends HasTimestamps>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const tA = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const tB = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return tB - tA;
  });
}

function JurisConnectApp() {
  const [lang, setLang] = useState<LanguageCode>('en');
  const [dark, setDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [lowBandwidth, setLowBandwidth] = useState(false);

  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserPublic | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [viewMode, setViewMode] = useState<'landing' | 'auth' | 'workspace'>('landing');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('citizen');

  const [cases, setCases] = useState<LegalCase[]>([]);
  const [mediations, setMediations] = useState<MediationSession[]>([]);
  const [referrals, setReferrals] = useState<CaseReferral[]>([]);
  const [meetings, setMeetings] = useState<CommitteeMeeting[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [directoryUsers, setDirectoryUsers] = useState<UserPublic[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyChannel, setApplyChannel] = useState<IntakeChannel>('web');
  const [ussdOpen, setUssdOpen] = useState(false);
  const [ussdMode, setUssdMode] = useState<'ussd' | 'helpline'>('ussd');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('signin');
  const [authModalRole, setAuthModalRole] = useState<OperationalRole>('citizen');
  const [pendingTargetTab, setPendingTargetTab] = useState<WorkspaceTab | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Sync HTML theme classes
  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add('dark');
    else root.classList.remove('dark');

    if (highContrast) root.classList.add('high-contrast');
    else root.classList.remove('high-contrast');
  }, [dark, highContrast]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUserProfile(null);
        setUserEmail('');
        setCases([]);
        setMediations([]);
        setReferrals([]);
        setMeetings([]);
        setComplaints([]);
        setAuditLogs([]);
        setDirectoryUsers([]);
        setAuthReady(true);
        return;
      }

      setUserEmail(fbUser.email || '');
      try {
        const profile = await ensureUserProfile(lang);
        setUserProfile(profile);
        if (profile?.preferredLanguage) {
          setLang(profile.preferredLanguage);
        }
        if (profile?.role) {
          setActiveTab((prev) =>
            prev === 'citizen' ? (getWorkspaceTabForRole(profile.role) as WorkspaceTab) : prev
          );
        }
      } catch (err) {
        console.error('Profile sync error:', err);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // Real-time Firestore listeners (only attached once auth is ready and user is authenticated)
  useEffect(() => {
    if (!authReady || !userProfile || !auth.currentUser) return;

    setLoadingData(true);
    const uid = auth.currentUser.uid;
    const isRootAdmin =
      auth.currentUser.email === BOOTSTRAPPED_ADMIN_EMAIL &&
      auth.currentUser.emailVerified;

    const unsubs: Array<() => void> = [];

    // 1. Cases listener (role-aware queries matching Firestore allow list rules)
    if (isRootAdmin) {
      const casesQ = query(collection(db, 'cases'), orderBy('updatedAt', 'desc'));
      unsubs.push(
        onSnapshot(
          casesQ,
          (snap) => {
            setCases(snap.docs.map((d) => d.data() as LegalCase));
            setLoadingData(false);
          },
          (err) => {
            setLoadingData(false);
            handleFirestoreError(err, OperationType.LIST, 'cases');
          }
        )
      );
    } else {
      const casesBuckets = new Map<string, Map<string, LegalCase>>();
      const syncCasesState = () => {
        const merged = new Map<string, LegalCase>();
        casesBuckets.forEach((bucket) => {
          bucket.forEach((val, id) => merged.set(id, val));
        });
        setCases(sortByTimestampDesc(Array.from(merged.values())));
        setLoadingData(false);
      };

      const attachCasesQuery = (bucketKey: string, q: ReturnType<typeof query>) => {
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const bucket = new Map<string, LegalCase>();
              snap.docs.forEach((d) => {
                const data = d.data() as LegalCase;
                bucket.set(data.caseId || d.id, data);
              });
              casesBuckets.set(bucketKey, bucket);
              syncCasesState();
            },
            (err) => {
              setLoadingData(false);
              handleFirestoreError(err, OperationType.LIST, 'cases');
            }
          )
        );
      };

      attachCasesQuery('citizen', query(collection(db, 'cases'), where('citizenUid', '==', uid)));
      if (userProfile.role === 'panel_lawyer') {
        attachCasesQuery('lawyer', query(collection(db, 'cases'), where('assignedLawyerUid', '==', uid)));
      }
      if (userProfile.role === 'mediator') {
        attachCasesQuery('mediator', query(collection(db, 'cases'), where('assignedMediatorUid', '==', uid)));
      }
    }

    // 2. Mediations listener
    if (isRootAdmin) {
      const medQ = query(collection(db, 'mediations'), orderBy('updatedAt', 'desc'));
      unsubs.push(
        onSnapshot(
          medQ,
          (snap) => setMediations(snap.docs.map((d) => d.data() as MediationSession)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'mediations')
        )
      );
    } else {
      const medBuckets = new Map<string, Map<string, MediationSession>>();
      const syncMedState = () => {
        const merged = new Map<string, MediationSession>();
        medBuckets.forEach((bucket) => {
          bucket.forEach((val, id) => merged.set(id, val));
        });
        setMediations(sortByTimestampDesc(Array.from(merged.values())));
      };

      const attachMedQuery = (bucketKey: string, q: ReturnType<typeof query>) => {
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const bucket = new Map<string, MediationSession>();
              snap.docs.forEach((d) => {
                const data = d.data() as MediationSession;
                bucket.set(data.mediationId || d.id, data);
              });
              medBuckets.set(bucketKey, bucket);
              syncMedState();
            },
            (err) => handleFirestoreError(err, OperationType.LIST, 'mediations')
          )
        );
      };

      attachMedQuery('citizen', query(collection(db, 'mediations'), where('citizenUid', '==', uid)));
      if (userProfile.role === 'mediator') {
        attachMedQuery('mediator', query(collection(db, 'mediations'), where('mediatorUid', '==', uid)));
      }
    }

    // 3. Referrals listener
    if (isRootAdmin) {
      const refQ = query(collection(db, 'referrals'), orderBy('updatedAt', 'desc'));
      unsubs.push(
        onSnapshot(
          refQ,
          (snap) => setReferrals(snap.docs.map((d) => d.data() as CaseReferral)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'referrals')
        )
      );
    } else {
      const refBuckets = new Map<string, Map<string, CaseReferral>>();
      const syncRefState = () => {
        const merged = new Map<string, CaseReferral>();
        refBuckets.forEach((bucket) => {
          bucket.forEach((val, id) => merged.set(id, val));
        });
        setReferrals(sortByTimestampDesc(Array.from(merged.values())));
      };

      const attachRefQuery = (bucketKey: string, q: ReturnType<typeof query>) => {
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const bucket = new Map<string, CaseReferral>();
              snap.docs.forEach((d) => {
                const data = d.data() as CaseReferral;
                bucket.set(data.referralId || d.id, data);
              });
              refBuckets.set(bucketKey, bucket);
              syncRefState();
            },
            (err) => handleFirestoreError(err, OperationType.LIST, 'referrals')
          )
        );
      };

      attachRefQuery('citizen', query(collection(db, 'referrals'), where('citizenUid', '==', uid)));
      attachRefQuery('requester', query(collection(db, 'referrals'), where('requestedByUid', '==', uid)));
    }

    // 4. Complaints listener
    const cmpQ = isRootAdmin
      ? query(collection(db, 'complaints'), orderBy('updatedAt', 'desc'))
      : query(collection(db, 'complaints'), where('reporterUid', '==', uid));
    unsubs.push(
      onSnapshot(
        cmpQ,
        (snap) => setComplaints(snap.docs.map((d) => d.data() as Complaint)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'complaints')
      )
    );

    // 5. Committee Meetings listener
    const meetQ = isRootAdmin
      ? query(collection(db, 'committeeMeetings'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'committeeMeetings'), where('createdByUid', '==', uid));
    unsubs.push(
      onSnapshot(
        meetQ,
        (snap) => setMeetings(snap.docs.map((d) => d.data() as CommitteeMeeting)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'committeeMeetings')
      )
    );

    // 6. Audit Logs listener
    const logQ = isRootAdmin
      ? query(collection(db, 'auditLogs'), orderBy('createdAt', 'desc'))
      : query(collection(db, 'auditLogs'), where('actorUid', '==', uid));
    unsubs.push(
      onSnapshot(
        logQ,
        (snap) => setAuditLogs(snap.docs.map((d) => d.data() as AuditLog)),
        (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
      )
    );

    // 7. Users directory (Admin only)
    if (isRootAdmin) {
      unsubs.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => setDirectoryUsers(snap.docs.map((d) => d.data() as UserPublic)),
          (err) => handleFirestoreError(err, OperationType.LIST, 'users')
        )
      );
    }

    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, [authReady, userProfile?.uid, userProfile?.role]);

  const handleOpenAuthPage = (opts?: {
    mode?: AuthModalMode;
    role?: OperationalRole;
    targetTab?: string;
  }) => {
    setAuthError(null);
    setAuthModalMode(opts?.mode || 'signin');
    setAuthModalRole(opts?.role || 'citizen');
    setPendingTargetTab((opts?.targetTab as WorkspaceTab) || null);
    setViewMode('auth');
  };

  const handleOpenAuthModal = (opts?: {
    mode?: AuthModalMode;
    role?: OperationalRole;
    targetTab?: string;
  }) => {
    setAuthError(null);
    setAuthModalMode(opts?.mode || 'signin');
    setAuthModalRole(opts?.role || 'citizen');
    setPendingTargetTab((opts?.targetTab as WorkspaceTab) || null);
    setAuthModalOpen(true);
  };

  const handleAuthenticated = (profile: UserPublic, targetTab?: string) => {
    setUserProfile(profile);
    setUserEmail(auth.currentUser?.email || '');
    setAuthModalOpen(false);
    const resolvedTab =
      pendingTargetTab ||
      (targetTab as WorkspaceTab) ||
      (getWorkspaceTabForRole(profile.role) as WorkspaceTab);
    setActiveTab(resolvedTab);
    setPendingTargetTab(null);
    if (!applyOpen && !ussdOpen) {
      setViewMode('workspace');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setViewMode('landing');
    setActiveTab('citizen');
  };

  const selectedCase = cases.find((c) => c.caseId === selectedCaseId) || null;

  return (
    <>
      {authError && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm p-4 rounded-xl bg-red-600 text-white text-xs shadow-lg flex items-center justify-between gap-3">
          <span>{authError}</span>
          <button type="button" onClick={() => setAuthError(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      {viewMode === 'workspace' && userProfile ? (
        <WorkspaceShell
          user={userProfile}
          userEmail={userEmail}
          activeTab={activeTab}
          lang={lang}
          dark={dark}
          lowBandwidth={lowBandwidth}
          cases={cases}
          mediations={mediations}
          referrals={referrals}
          meetings={meetings}
          complaints={complaints}
          auditLogs={auditLogs}
          directoryUsers={directoryUsers}
          loadingData={loadingData}
          onSelectTab={setActiveTab}
          onSelectCase={(c) => setSelectedCaseId(c.caseId)}
          onOpenApply={(ch) => {
            setApplyChannel(ch || 'web');
            setApplyOpen(true);
          }}
          onOpenUssdModal={(mode) => {
            setUssdMode(mode);
            setUssdOpen(true);
          }}
          onToggleLang={() => setLang((p) => (p === 'en' ? 'bn' : 'en'))}
          onToggleDark={() => setDark((p) => !p)}
          onGoHome={() => setViewMode('landing')}
          onSignOut={handleSignOut}
        />
      ) : viewMode === 'auth' ? (
        <AuthPageView
          mode={authModalMode}
          onModeChange={setAuthModalMode}
          initialRole={authModalRole}
          lang={lang}
          dark={dark}
          onToggleLang={() => setLang((p) => (p === 'en' ? 'bn' : 'en'))}
          onToggleDark={() => setDark((p) => !p)}
          onBackHome={() => {
            setPendingTargetTab(null);
            setViewMode('landing');
          }}
          onAuthenticated={handleAuthenticated}
        />
      ) : (
        <LandingView
          lang={lang}
          dark={dark}
          lowBandwidth={lowBandwidth}
          highContrast={highContrast}
          user={userProfile}
          onToggleLang={() => setLang((p) => (p === 'en' ? 'bn' : 'en'))}
          onToggleDark={() => setDark((p) => !p)}
          onToggleLowBandwidth={() => setLowBandwidth((p) => !p)}
          onToggleHighContrast={() => setHighContrast((p) => !p)}
          onOpenApply={(ch) => {
            setApplyChannel(ch || 'web');
            setApplyOpen(true);
          }}
          onOpenUssdModal={(mode) => {
            setUssdMode(mode);
            setUssdOpen(true);
          }}
          onSignIn={handleOpenAuthPage}
          onEnterWorkspace={(tab) => {
            if (tab) {
              setActiveTab(tab as WorkspaceTab);
            } else if (userProfile) {
              setActiveTab(getWorkspaceTabForRole(userProfile.role) as WorkspaceTab);
            }
            setViewMode('workspace');
          }}
        />
      )}

      <AuthModal
        open={authModalOpen}
        initialMode={authModalMode}
        initialRole={authModalRole}
        lang={lang}
        onClose={() => {
          setAuthModalOpen(false);
          setPendingTargetTab(null);
        }}
        onAuthenticated={handleAuthenticated}
      />

      <ApplicationWizard
        open={applyOpen}
        lang={lang}
        user={userProfile}
        lowBandwidth={lowBandwidth}
        initialChannel={applyChannel}
        onClose={() => setApplyOpen(false)}
        onRequireAuth={() => handleOpenAuthModal({ mode: 'signin', role: 'citizen' })}
        onCreated={() => {
          if (userProfile) setViewMode('workspace');
        }}
      />

      <UssdHelplineModal
        open={ussdOpen}
        initialMode={ussdMode}
        lang={lang}
        user={userProfile}
        lowBandwidth={lowBandwidth}
        onClose={() => setUssdOpen(false)}
        onRequireAuth={() => handleOpenAuthModal({ mode: 'signin', role: 'citizen' })}
        onCaseCreated={() => {
          if (userProfile) setViewMode('workspace');
        }}
      />

      {userProfile && selectedCase && (
        <CaseDetailDrawer
          legalCase={selectedCase}
          user={userProfile}
          lang={lang}
          lowBandwidth={lowBandwidth}
          onClose={() => setSelectedCaseId(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <JurisConnectApp />
    </ErrorBoundary>
  );
}
