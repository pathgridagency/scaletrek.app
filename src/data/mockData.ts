export type UserRole = 'dreamer' | 'investor' | 'admin';
export type FeedType = 'dreamer' | 'reality';
export type VerificationLevel = 'none' | 'basic' | 'verified' | 'elite';
export type DealStage = 'exploring' | 'negotiating' | 'closed';
export type NotificationType = 'signal' | 'follow' | 'deal' | 'system' | 'verification';

export interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  role: UserRole;
  bio: string;
  industry?: string;
  momentumScore: number;
  verificationLevel: VerificationLevel;
  followers: number;
  following: number;
  showcaseCount: number;
  suspended?: boolean;
  joinedAt?: string;
  publicKey?: string;
  // Phase 7 privacy: false when this is an investor and the viewer is not
  // engaged/authorised — the row's name/bio/avatar will be the masked alias.
  identityRevealed?: boolean;
  // Investor-only: when true, identity is revealed to everyone.
  revealToAll?: boolean;
  // Phase 8: false for fresh OAuth sign-ups until they finish CompleteProfileScreen.
  profileComplete?: boolean;
  // Phase 16: true once the user has finished OnboardingScreen; persisted to
  // profiles.onboarded so reinstalls don't restart onboarding.
  onboarded?: boolean;
  // Phase 18: true while subscriptions.tier='pro' and status active/trialing.
  // Exposed via the public_profiles view; read-only on the client.
  isPro?: boolean;
  // Phase 22: extended profile fields.
  avatarUrl?: string;
  coverUrl?: string;
  headline?: string;
  location?: string;
  website?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  instagramUrl?: string;
  githubUrl?: string;
  facebookUrl?: string;
  companyName?: string;
  sector?: string;
  foundedYear?: number;
  teamSize?: string;
  // Phase 34: Synergy Match — cross-industry partnership matching.
  strengths?: string[];
  bottlenecks?: string[];
  openToSynergy?: boolean;
  synergyHoursPerWeek?: number;
  synergyEquityExpectation?: string;
}

export interface Credential {
  email: string;
  password: string;
  userId: string;
}

export interface PostMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  durationMs?: number;
  position: number;
}

export interface ShowcasePost {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  verificationLevel: VerificationLevel;
  type: FeedType;
  milestoneTitle: string;
  description: string;
  tags: string[];
  mediaType: 'image' | 'video' | 'metric';
  mediaUrl?: string;
  media?: PostMedia[];
  metric?: { label: string; value: string; unit?: string };
  momentumScore: number;
  likes: number;
  likedBy?: string[];
  comments: number;
  signals: number;
  signaledBy?: string[];
  riskScore: number;
  rewardScore: number;
  createdAt: string;
  createdAtMs?: number;
  industry: string;
  fundingGoal?: string;
  currentFunding?: string;
  removed?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  moderationReason?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  nonce?: string;
  timestamp: string;
  encrypted: boolean;
  read: boolean;
}

export interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  dealStatus: DealStage;
  messages: ChatMessage[];
}

export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  postId?: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface Report {
  id: string;
  postId: string;
  reporterId: string;
  reason: string;
  createdAt: string;
  resolved: boolean;
  action?: 'kept' | 'removed';
}

export interface VerificationRequest {
  id: string;
  userId: string;
  requestedLevel: VerificationLevel;
  evidence: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Deal {
  id: string;
  investorId: string;
  dreamerId: string;
  postId?: string;
  stage: DealStage;
  amount?: string;
  notes?: string;
  updatedAt: string;
}

export const SEED_USERS: User[] = [
  {
    id: 'admin',
    name: 'Scaletrek Admin',
    username: '@admin',
    avatar: 'SA',
    role: 'admin',
    bio: 'Platform operator.',
    momentumScore: 100,
    verificationLevel: 'elite',
    followers: 0,
    following: 0,
    showcaseCount: 0,
    joinedAt: '2024-01-01',
  },
  {
    id: 'u1',
    name: 'Karim Benali',
    username: '@karimb',
    avatar: 'KB',
    role: 'dreamer',
    bio: 'Building the future of agri-tech in North Africa. Seed stage.',
    industry: 'AgriTech',
    momentumScore: 87,
    verificationLevel: 'basic',
    followers: 1240,
    following: 380,
    showcaseCount: 14,
    joinedAt: '2024-03-12',
  },
  {
    id: 'u2',
    name: 'Youssef Idrissi',
    username: '@yidrissi',
    avatar: 'YI',
    role: 'dreamer',
    bio: 'Co-founder at PayFlow MA. FinTech infrastructure for the unbanked.',
    industry: 'FinTech',
    momentumScore: 94,
    verificationLevel: 'verified',
    followers: 4870,
    following: 210,
    showcaseCount: 31,
    joinedAt: '2024-01-22',
  },
  {
    id: 'u3',
    name: 'Nour Hamidi',
    username: '@nourh',
    avatar: 'NH',
    role: 'investor',
    bio: 'Angel investor. 12 exits. Focus: FinTech, AgriTech, HealthTech MENA.',
    industry: 'Venture',
    momentumScore: 99,
    verificationLevel: 'elite',
    followers: 12400,
    following: 94,
    showcaseCount: 0,
    joinedAt: '2023-11-04',
  },
  {
    id: 'u4',
    name: 'Salma Tazi',
    username: '@salmatazi',
    avatar: 'ST',
    role: 'dreamer',
    bio: 'EdTech founder. Democratizing quality education in Morocco.',
    industry: 'EdTech',
    momentumScore: 72,
    verificationLevel: 'basic',
    followers: 890,
    following: 450,
    showcaseCount: 9,
    joinedAt: '2024-05-08',
  },
];

export const SEED_CREDENTIALS: Credential[] = [
  { email: 'admin@scaletrek.app', password: 'admin123', userId: 'admin' },
  { email: 'karim@scaletrek.app', password: 'demo1234', userId: 'u1' },
  { email: 'youssef@scaletrek.app', password: 'demo1234', userId: 'u2' },
  { email: 'nour@scaletrek.app', password: 'demo1234', userId: 'u3' },
  { email: 'salma@scaletrek.app', password: 'demo1234', userId: 'u4' },
];

export const SEED_FEED: ShowcasePost[] = [
  {
    id: 'p1',
    userId: 'u1',
    userName: 'Karim Benali',
    userAvatar: 'KB',
    verificationLevel: 'basic',
    type: 'dreamer',
    milestoneTitle: 'Prototype V2 Deployed',
    description:
      'Shipped our second prototype to 50 pilot farms in Meknes. Soil health sensors now reading 98% accuracy. Feedback loop between farmers and our AI model is working.',
    tags: ['AgriTech', 'IoT', 'AI', 'Morocco'],
    mediaType: 'metric',
    metric: { label: 'Pilot Farms', value: '50', unit: 'active' },
    momentumScore: 87,
    likes: 342,
    likedBy: [],
    comments: 28,
    signals: 12,
    signaledBy: [],
    riskScore: 6.2,
    rewardScore: 8.8,
    createdAt: '2h ago',
    createdAtMs: Date.now() - 2 * 3600_000,
    industry: 'AgriTech',
    fundingGoal: '500K MAD',
    currentFunding: '180K MAD',
  },
  {
    id: 'p2',
    userId: 'u2',
    userName: 'Youssef Idrissi',
    userAvatar: 'YI',
    verificationLevel: 'verified',
    type: 'reality',
    milestoneTitle: 'First 10,000 MAD Revenue Hit',
    description:
      'PayFlow processed its first 10K MAD in transaction fees this month. 3 months after launch. Revenue is real, not hypothetical. 847 active merchants onboarded. Growing 23% MoM.',
    tags: ['FinTech', 'Revenue', 'Growth', 'MENA'],
    mediaType: 'metric',
    metric: { label: 'Monthly Revenue', value: '10K', unit: 'MAD' },
    momentumScore: 94,
    likes: 1204,
    likedBy: [],
    comments: 87,
    signals: 46,
    signaledBy: [],
    riskScore: 3.1,
    rewardScore: 9.4,
    createdAt: '5h ago',
    createdAtMs: Date.now() - 5 * 3600_000,
    industry: 'FinTech',
    fundingGoal: '2M MAD',
    currentFunding: '1.4M MAD',
  },
  {
    id: 'p3',
    userId: 'u4',
    userName: 'Salma Tazi',
    userAvatar: 'ST',
    verificationLevel: 'basic',
    type: 'dreamer',
    milestoneTitle: 'Beta App Launched — 200 Students',
    description:
      'Our adaptive learning platform crossed 200 active students in 2 weeks with zero paid acquisition. All organic. Teachers say retention is up 40% vs traditional methods.',
    tags: ['EdTech', 'Mobile', 'Education'],
    mediaType: 'metric',
    metric: { label: 'Active Students', value: '200', unit: 'organic' },
    momentumScore: 72,
    likes: 567,
    likedBy: [],
    comments: 41,
    signals: 18,
    signaledBy: [],
    riskScore: 5.5,
    rewardScore: 7.9,
    createdAt: '1d ago',
    createdAtMs: Date.now() - 24 * 3600_000,
    industry: 'EdTech',
    fundingGoal: '300K MAD',
    currentFunding: '60K MAD',
  },
  {
    id: 'p4',
    userId: 'u2',
    userName: 'Youssef Idrissi',
    userAvatar: 'YI',
    verificationLevel: 'verified',
    type: 'reality',
    milestoneTitle: 'Series A Term Sheet Signed',
    description:
      'After 8 months of building in public and showing real traction, we have signed our first institutional term sheet. This validates the Reality Check approach: show the work, earn the trust.',
    tags: ['FinTech', 'SeriesA', 'Funding'],
    mediaType: 'metric',
    metric: { label: 'Funding Round', value: 'Series A', unit: 'signed' },
    momentumScore: 98,
    likes: 3401,
    likedBy: [],
    comments: 204,
    signals: 112,
    signaledBy: [],
    riskScore: 2.0,
    rewardScore: 9.8,
    createdAt: '2d ago',
    createdAtMs: Date.now() - 48 * 3600_000,
    industry: 'FinTech',
    fundingGoal: '5M MAD',
    currentFunding: '5M MAD',
  },
  {
    id: 'p5',
    userId: 'u1',
    userName: 'Karim Benali',
    userAvatar: 'KB',
    verificationLevel: 'basic',
    type: 'dreamer',
    milestoneTitle: 'First LOI from Cooperative',
    description:
      'Received a Letter of Intent from the Meknes Agricultural Cooperative — 800 farms. If this converts, we jump from pilot to scale. Biggest moment in 18 months of work.',
    tags: ['AgriTech', 'B2B', 'Growth'],
    mediaType: 'metric',
    metric: { label: 'LOI Value', value: '800', unit: 'farms' },
    momentumScore: 91,
    likes: 788,
    likedBy: [],
    comments: 54,
    signals: 27,
    signaledBy: [],
    riskScore: 5.0,
    rewardScore: 9.2,
    createdAt: '3d ago',
    createdAtMs: Date.now() - 72 * 3600_000,
    industry: 'AgriTech',
    fundingGoal: '500K MAD',
    currentFunding: '220K MAD',
  },
];

export const SEED_CHATS: ChatThread[] = [
  {
    id: 'c1',
    participantId: 'u3',
    participantName: 'Nour Hamidi',
    participantAvatar: 'NH',
    lastMessage: "Let's schedule a call this week.",
    lastTime: '14m ago',
    unread: 2,
    dealStatus: 'negotiating',
    messages: [
      {
        id: 'm1',
        senderId: 'u3',
        senderName: 'Nour Hamidi',
        content: "Your PayFlow numbers are compelling. I've been watching the feed for 3 months.",
        timestamp: '10:20 AM',
        encrypted: true,
        read: true,
      },
      {
        id: 'm2',
        senderId: 'u2',
        senderName: 'Youssef Idrissi',
        content: "Thank you Nour. We're very deliberate about showing real metrics publicly.",
        timestamp: '10:35 AM',
        encrypted: true,
        read: true,
      },
      {
        id: 'm3',
        senderId: 'u3',
        senderName: 'Nour Hamidi',
        content: "That's exactly what I look for. Zero vanity metrics. Let's schedule a call this week.",
        timestamp: '10:41 AM',
        encrypted: true,
        read: false,
      },
    ],
  },
  {
    id: 'c2',
    participantId: 'u4',
    participantName: 'Salma Tazi',
    participantAvatar: 'ST',
    lastMessage: 'Reviewing your deck now.',
    lastTime: '2h ago',
    unread: 0,
    dealStatus: 'exploring',
    messages: [
      {
        id: 'm4',
        senderId: 'u4',
        senderName: 'Salma Tazi',
        content: 'Hi Nour, I saw you signaled on my showcase post. Happy to share more details.',
        timestamp: '9:00 AM',
        encrypted: true,
        read: true,
      },
      {
        id: 'm5',
        senderId: 'u3',
        senderName: 'Nour Hamidi',
        content: 'Reviewing your deck now.',
        timestamp: '9:30 AM',
        encrypted: true,
        read: true,
      },
    ],
  },
];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'n1',
    type: 'signal',
    recipientId: 'u1',
    actorId: 'u3',
    actorName: 'Nour Hamidi',
    actorAvatar: 'NH',
    postId: 'p1',
    message: 'signaled your Prototype V2 milestone',
    createdAt: '2h ago',
    read: false,
  },
  {
    id: 'n2',
    type: 'follow',
    recipientId: 'u1',
    actorId: 'u4',
    actorName: 'Salma Tazi',
    actorAvatar: 'ST',
    message: 'started following you',
    createdAt: '6h ago',
    read: false,
  },
  {
    id: 'n3',
    type: 'verification',
    recipientId: 'u2',
    message: 'Your Verified status was approved',
    createdAt: '1d ago',
    read: true,
  },
];

export const SEED_DEALS: Deal[] = [
  {
    id: 'd1',
    investorId: 'u3',
    dreamerId: 'u2',
    postId: 'p4',
    stage: 'negotiating',
    amount: '500K MAD',
    notes: 'Term sheet under review.',
    updatedAt: '2024-04-12',
  },
  {
    id: 'd2',
    investorId: 'u3',
    dreamerId: 'u4',
    postId: 'p3',
    stage: 'exploring',
    notes: 'Reviewing deck.',
    updatedAt: '2024-04-10',
  },
];
