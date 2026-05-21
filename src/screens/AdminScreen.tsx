import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import {
  Shield,
  Users as UsersIcon,
  FileText,
  CheckCircle2,
  BarChart3,
  XCircle,
  Pause,
  Play,
  Search as SearchIcon,
  TrendingUp,
  Activity,
  Inbox,
} from 'lucide-react-native';
import { Radii, Spacing, Typography, elevationFor } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { useUsersStore } from '../store/useUsersStore';
import { useFeedStore } from '../store/useFeedStore';
import { useModerationStore } from '../store/useModerationStore';
import { useDealsStore } from '../store/useDealsStore';
import { Screen } from '../components/ui/Screen';
import { GlassCard } from '../components/ui/GlassCard';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { UserRole, VerificationLevel, User, ShowcasePost } from '../data/mockData';

type Tab = 'analytics' | 'users' | 'posts' | 'verification' | 'queue';

const VERIFY_LEVELS: VerificationLevel[] = ['none', 'basic', 'verified', 'elite'];
const ROLES: UserRole[] = ['dreamer', 'investor', 'admin'];

const ROLE_LABEL: Record<UserRole, string> = {
  dreamer: 'Dreamer',
  investor: 'Investor',
  admin: 'Admin',
};

export const AdminScreen: React.FC = () => {
  const { palette } = useTheme();
  const me = useAuthStore((s) => s.user);
  const allUsers = useAuthStore((s) => s.users);
  const usersOps = useUsersStore();
  const posts = useFeedStore((s) => s.posts);
  const removePost = useFeedStore((s) => s.removePost);
  const restorePost = useFeedStore((s) => s.restorePost);
  const pendingReality = useFeedStore((s) => s.pendingReality);
  const approvePost = useFeedStore((s) => s.approvePost);
  const rejectPost = useFeedStore((s) => s.rejectPost);
  const refreshFeed = useFeedStore((s) => s.refresh);
  const deals = useDealsStore((s) => s.items);
  const reports = useModerationStore((s) => s.reports);
  const verificationRequests = useModerationStore((s) => s.verificationRequests);
  const resolveReport = useModerationStore((s) => s.resolveReport);
  const decideVerification = useModerationStore((s) => s.decideVerification);
  const [tab, setTab] = useState<Tab>('analytics');
  const [userQuery, setUserQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | UserRole | 'suspended'>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [queueRefreshing, setQueueRefreshing] = useState(false);

  const s = styles(palette);

  const queue = useMemo(() => pendingReality(), [pendingReality, posts]);

  const refreshQueue = async () => {
    setQueueRefreshing(true);
    try {
      await refreshFeed();
    } catch (e) {
      console.warn('[admin] queue refresh failed', e);
    } finally {
      setQueueRefreshing(false);
    }
  };

  const adminCount = useMemo(() => allUsers.filter((u) => u.role === 'admin').length, [allUsers]);

  const analytics = useMemo(() => {
    const total = allUsers.length;
    const dreamers = allUsers.filter((u) => u.role === 'dreamer').length;
    const investors = allUsers.filter((u) => u.role === 'investor').length;
    const admins = allUsers.filter((u) => u.role === 'admin').length;
    const suspended = allUsers.filter((u) => u.suspended).length;
    const activePosts = posts.filter((p) => !p.removed).length;
    const totalSignals = posts.reduce((acc, p) => acc + p.signals, 0);
    const totalLikes = posts.reduce((acc, p) => acc + p.likes, 0);
    const closedDeals = deals.filter((d) => d.stage === 'closed').length;
    const pendingReports = reports.filter((r) => !r.resolved).length;
    const pendingVerif = verificationRequests.filter((r) => r.status === 'pending').length;
    const avgMomentum = total
      ? Math.round(allUsers.reduce((acc, u) => acc + u.momentumScore, 0) / total)
      : 0;
    return {
      total,
      dreamers,
      investors,
      admins,
      suspended,
      activePosts,
      totalSignals,
      totalLikes,
      closedDeals,
      pendingReports,
      pendingVerif,
      avgMomentum,
    };
  }, [allUsers, posts, deals, reports, verificationRequests]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return allUsers.filter((u) => {
      if (userFilter === 'suspended' && !u.suspended) return false;
      if (userFilter !== 'all' && userFilter !== 'suspended' && u.role !== userFilter) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        (u.industry ?? '').toLowerCase().includes(q)
      );
    });
  }, [allUsers, userQuery, userFilter]);

  const safeRun = async (id: string, label: string, fn: () => Promise<void>) => {
    setBusyId(id);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert(`Couldn't ${label}`, e?.message ?? 'Unknown error.');
    } finally {
      setBusyId(null);
    }
  };

  const onChangeRole = (target: User, nextRole: UserRole) => {
    if (target.role === nextRole) return;
    const isSelf = me?.id === target.id;
    if (isSelf) {
      Alert.alert(
        'Not allowed',
        'You cannot change your own role. Have another admin promote/demote you.',
      );
      return;
    }
    if (target.role === 'admin' && nextRole !== 'admin' && adminCount <= 1) {
      Alert.alert(
        'Last admin',
        'You can\'t demote the only remaining admin. Promote another user first.',
      );
      return;
    }
    const verb = nextRole === 'admin' ? 'promote to admin' : `set role to ${ROLE_LABEL[nextRole]}`;
    Alert.alert(`${target.name}`, `Are you sure you want to ${verb}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        style: nextRole === 'admin' ? 'default' : 'destructive',
        onPress: () => safeRun(target.id, 'change role', () => usersOps.setRole(target.id, nextRole)),
      },
    ]);
  };

  const onChangeVerification = (target: User, lvl: VerificationLevel) => {
    if (target.verificationLevel === lvl) return;
    safeRun(target.id, 'set verification', () => usersOps.setVerification(target.id, lvl));
  };

  const onToggleSuspend = (target: User) => {
    if (me?.id === target.id) {
      Alert.alert('Not allowed', 'You cannot suspend your own account.');
      return;
    }
    if (target.role === 'admin') {
      Alert.alert(
        'Suspending an admin',
        'This will lock another admin out. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: target.suspended ? 'Reinstate' : 'Suspend',
            style: 'destructive',
            onPress: () => safeRun(target.id, 'toggle suspend', () => usersOps.setSuspended(target.id, !target.suspended)),
          },
        ],
      );
      return;
    }
    safeRun(target.id, 'toggle suspend', () => usersOps.setSuspended(target.id, !target.suspended));
  };

  return (
    <Screen>
      <View style={s.header}>
        <View style={[s.headerIcon, { backgroundColor: palette.adminSubtle, borderColor: palette.adminBorder }]}>
          <Shield size={18} color={palette.admin} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Admin Panel</Text>
          <Text style={s.subtitle}>{analytics.total} users · {analytics.activePosts} active posts</Text>
        </View>
      </View>

      <View style={s.tabsRow}>
        {([
          { value: 'analytics', label: 'Stats', icon: BarChart3, badge: 0 },
          { value: 'users', label: 'Users', icon: UsersIcon, badge: analytics.suspended },
          { value: 'queue', label: 'Queue', icon: Inbox, badge: queue.length },
          { value: 'posts', label: 'Flags', icon: FileText, badge: analytics.pendingReports },
          { value: 'verification', label: 'KYC', icon: CheckCircle2, badge: analytics.pendingVerif },
        ] as const).map(({ value, label, icon: Icon, badge }) => {
          const active = tab === value;
          return (
            <TouchableOpacity
              key={value}
              activeOpacity={0.85}
              style={[
                s.tab,
                active && {
                  backgroundColor: palette.admin,
                  borderColor: palette.admin,
                  ...elevationFor(palette, 'sm'),
                },
              ]}
              onPress={() => setTab(value)}
            >
              <Icon size={15} color={active ? palette.white : palette.textSecondary} strokeWidth={2.2} />
              <Text style={[s.tabLabel, { color: active ? palette.white : palette.textSecondary }]}>
                {label}
              </Text>
              {!!badge && badge > 0 && (
                <View style={[s.tabBadge, { backgroundColor: active ? palette.white : palette.error }]}>
                  <Text style={[s.tabBadgeText, { color: active ? palette.admin : palette.white }]}>
                    {badge}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'analytics' && (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.kpiRow}>
            <KpiCard
              palette={palette}
              icon={<UsersIcon size={16} color={palette.accent} strokeWidth={2.2} />}
              label="Total users"
              value={analytics.total}
              accent={palette.accent}
            />
            <KpiCard
              palette={palette}
              icon={<Activity size={16} color={palette.success} strokeWidth={2.2} />}
              label="Active posts"
              value={analytics.activePosts}
              accent={palette.success}
            />
            <KpiCard
              palette={palette}
              icon={<TrendingUp size={16} color={palette.pro} strokeWidth={2.2} />}
              label="Avg momentum"
              value={analytics.avgMomentum}
              accent={palette.pro}
            />
            <KpiCard
              palette={palette}
              icon={<CheckCircle2 size={16} color={palette.elite} strokeWidth={2.2} />}
              label="Closed deals"
              value={analytics.closedDeals}
              accent={palette.elite}
            />
          </View>

          <GlassCard style={s.sectionCard} elevation="sm">
            <Text style={s.sectionTitle}>Roles</Text>
            <View style={s.distroList}>
              {[
                { label: 'Dreamers', count: analytics.dreamers, color: palette.dreamer },
                { label: 'Investors', count: analytics.investors, color: palette.reality },
                { label: 'Admins', count: analytics.admins, color: palette.admin },
                { label: 'Suspended', count: analytics.suspended, color: palette.error },
              ].map(({ label, count, color }) => {
                const pct = analytics.total ? (count / analytics.total) * 100 : 0;
                return (
                  <View key={label} style={s.distroRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                      <Text style={s.distroLabel}>{label}</Text>
                    </View>
                    <View style={[s.distroBar, { backgroundColor: palette.surface }]}>
                      <View style={[s.distroFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={s.distroVal}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={s.sectionCard} elevation="sm">
            <Text style={s.sectionTitle}>Verification distribution</Text>
            <View style={s.distroList}>
              {VERIFY_LEVELS.map((lvl) => {
                const count = allUsers.filter((u) => u.verificationLevel === lvl).length;
                const pct = analytics.total ? (count / analytics.total) * 100 : 0;
                const color =
                  lvl === 'elite'
                    ? palette.elite
                    : lvl === 'verified'
                      ? palette.success
                      : lvl === 'basic'
                        ? palette.info
                        : palette.textMuted;
                return (
                  <View key={lvl} style={s.distroRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                      <Text style={s.distroLabel}>{lvl[0].toUpperCase() + lvl.slice(1)}</Text>
                    </View>
                    <View style={[s.distroBar, { backgroundColor: palette.surface }]}>
                      <View style={[s.distroFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={s.distroVal}>{count}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard style={s.sectionCard} elevation="sm">
            <Text style={s.sectionTitle}>Engagement</Text>
            <View style={s.miniGrid}>
              <View style={s.miniItem}>
                <Text style={[s.miniValue, { color: palette.textPrimary }]}>{analytics.totalLikes}</Text>
                <Text style={s.miniLabel}>Total likes</Text>
              </View>
              <View style={s.miniItem}>
                <Text style={[s.miniValue, { color: palette.accent }]}>{analytics.totalSignals}</Text>
                <Text style={s.miniLabel}>Total signals</Text>
              </View>
              <View style={s.miniItem}>
                <Text style={[s.miniValue, { color: palette.warning }]}>{analytics.pendingReports}</Text>
                <Text style={s.miniLabel}>Pending reports</Text>
              </View>
              <View style={s.miniItem}>
                <Text style={[s.miniValue, { color: palette.elite }]}>{analytics.pendingVerif}</Text>
                <Text style={s.miniLabel}>Pending KYC</Text>
              </View>
            </View>
          </GlassCard>
        </ScrollView>
      )}

      {tab === 'users' && (
        <>
          <View style={s.searchRow}>
            <View style={[s.search, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <SearchIcon size={16} color={palette.textMuted} strokeWidth={2} />
              <TextInput
                value={userQuery}
                onChangeText={setUserQuery}
                placeholder="Search users by name, @ or industry"
                placeholderTextColor={palette.textMuted}
                style={[s.searchInput, { color: palette.textPrimary }]}
                autoCapitalize="none"
              />
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterRow}
          >
            {([
              { v: 'all', label: 'All' },
              { v: 'dreamer', label: 'Dreamers' },
              { v: 'investor', label: 'Investors' },
              { v: 'admin', label: 'Admins' },
              { v: 'suspended', label: 'Suspended' },
            ] as const).map(({ v, label }) => {
              const active = userFilter === v;
              return (
                <TouchableOpacity
                  key={v}
                  onPress={() => setUserFilter(v)}
                  style={[
                    s.filterChip,
                    {
                      backgroundColor: active ? palette.admin : palette.surface,
                      borderColor: active ? palette.admin : palette.border,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={{
                      color: active ? palette.white : palette.textSecondary,
                      fontSize: Typography.fontSizeXS,
                      fontWeight: Typography.fontWeightSemiBold,
                      letterSpacing: 0.3,
                    }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <FlatList
            data={filteredUsers}
            keyExtractor={(u) => u.id}
            contentContainerStyle={s.content}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <EmptyState
                icon={<UsersIcon size={28} color={palette.textSecondary} strokeWidth={2} />}
                title="No users match"
                description="Try a different search or filter."
              />
            }
            renderItem={({ item: u }) => {
              const isSelf = me?.id === u.id;
              const busy = busyId === u.id;
              const verifKind: 'none' | 'verified' | 'elite' | 'admin' =
                u.role === 'admin'
                  ? 'admin'
                  : u.verificationLevel === 'elite'
                    ? 'elite'
                    : u.verificationLevel === 'verified'
                      ? 'verified'
                      : 'none';
              return (
                <GlassCard style={s.userCard} elevation="sm">
                  <View style={s.userHead}>
                    <Avatar
                      initials={u.avatar}
                      imageUrl={u.avatarUrl}
                      size={48}
                      accent={u.role === 'admin' ? 'admin' : u.role === 'investor' ? 'reality' : 'dreamer'}
                      verification={verifKind}
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={s.userName} numberOfLines={1}>{u.name}</Text>
                        {isSelf && <Badge kind="neutral" label="YOU" size="xs" />}
                        {u.suspended && <Badge kind="neutral" label="SUSPENDED" size="xs" />}
                      </View>
                      <Text style={s.userMeta} numberOfLines={1}>
                        {u.username} · {u.industry ?? 'No industry'}
                      </Text>
                    </View>
                  </View>

                  <View style={s.userControls}>
                    <View style={s.controlGroup}>
                      <Text style={s.controlLabel}>Role</Text>
                      <View style={s.chipRow}>
                        {ROLES.map((r) => {
                          const active = u.role === r;
                          const disabled = isSelf && !active; // self can't change own role
                          return (
                            <TouchableOpacity
                              key={r}
                              activeOpacity={0.85}
                              disabled={disabled || busy}
                              style={[
                                s.chip,
                                active && {
                                  backgroundColor: palette.admin,
                                  borderColor: palette.admin,
                                },
                                disabled && { opacity: 0.4 },
                              ]}
                              onPress={() => onChangeRole(u, r)}
                            >
                              <Text style={[s.chipText, active && { color: palette.white }]}>
                                {ROLE_LABEL[r]}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <View style={s.controlGroup}>
                      <Text style={s.controlLabel}>Verification</Text>
                      <View style={s.chipRow}>
                        {VERIFY_LEVELS.map((lvl) => {
                          const active = u.verificationLevel === lvl;
                          return (
                            <TouchableOpacity
                              key={lvl}
                              activeOpacity={0.85}
                              disabled={busy}
                              style={[
                                s.chip,
                                active && {
                                  backgroundColor: palette.accent,
                                  borderColor: palette.accent,
                                },
                              ]}
                              onPress={() => onChangeVerification(u, lvl)}
                            >
                              <Text style={[s.chipText, active && { color: palette.white }]}>{lvl}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={busy || isSelf}
                      style={[
                        s.suspendBtn,
                        {
                          borderColor: u.suspended ? palette.success : palette.error,
                          opacity: isSelf ? 0.4 : 1,
                        },
                      ]}
                      onPress={() => onToggleSuspend(u)}
                    >
                      {u.suspended ? (
                        <>
                          <Play size={14} color={palette.success} strokeWidth={2.2} />
                          <Text style={[s.suspendText, { color: palette.success }]}>Reinstate</Text>
                        </>
                      ) : (
                        <>
                          <Pause size={14} color={palette.error} strokeWidth={2.2} />
                          <Text style={[s.suspendText, { color: palette.error }]}>Suspend</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              );
            }}
          />
        </>
      )}

      {tab === 'posts' && (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {reports.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} color={palette.textSecondary} strokeWidth={2} />}
              title="No reports"
              description="Flagged posts will land here as soon as users start reporting."
            />
          ) : (
            reports.map((r) => {
              const post = posts.find((p) => p.id === r.postId);
              if (!post) return null;
              return (
                <GlassCard key={r.id} style={s.reportCard} elevation="sm">
                  <View style={s.reportHeadRow}>
                    <Text style={s.reportTitle} numberOfLines={1}>{post.milestoneTitle}</Text>
                    <View
                      style={[
                        s.statusPill,
                        {
                          borderColor: r.resolved ? palette.border : palette.warning,
                          backgroundColor: r.resolved ? palette.surface : palette.warning + '22',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: r.resolved ? palette.textSecondary : palette.warning,
                          fontSize: 10,
                          fontWeight: Typography.fontWeightBold,
                          letterSpacing: 0.5,
                        }}
                      >
                        {r.resolved ? `RESOLVED · ${(r.action ?? 'NONE').toUpperCase()}` : 'PENDING'}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.reportMeta}>{post.userName} · {post.industry}</Text>
                  <Text style={s.reportDesc} numberOfLines={3}>{post.description}</Text>
                  <View style={[s.reasonBox, { backgroundColor: palette.warning + '14', borderColor: palette.warning + '44' }]}>
                    <Text style={[s.reasonLabel, { color: palette.warning }]}>REASON</Text>
                    <Text style={[s.reasonText, { color: palette.textPrimary }]}>{r.reason}</Text>
                  </View>
                  {!r.resolved && (
                    <View style={s.reportActions}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[s.actionBtn, { backgroundColor: palette.success + '14', borderColor: palette.success }]}
                        onPress={() => {
                          restorePost(post.id);
                          resolveReport(r.id, 'kept');
                        }}
                      >
                        <CheckCircle2 size={14} color={palette.success} strokeWidth={2.2} />
                        <Text style={[s.actionText, { color: palette.success }]}>Keep</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[s.actionBtn, { backgroundColor: palette.error + '14', borderColor: palette.error }]}
                        onPress={() => {
                          removePost(post.id);
                          resolveReport(r.id, 'removed');
                        }}
                      >
                        <XCircle size={14} color={palette.error} strokeWidth={2.2} />
                        <Text style={[s.actionText, { color: palette.error }]}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      )}

      {tab === 'verification' && (
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          {verificationRequests.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 size={28} color={palette.textSecondary} strokeWidth={2} />}
              title="No KYC requests"
              description="When users request verification you can approve or reject them here."
            />
          ) : (
            verificationRequests.map((r) => {
              const user = allUsers.find((u) => u.id === r.userId);
              if (!user) return null;
              const pending = r.status === 'pending';
              return (
                <GlassCard key={r.id} style={s.userCard} elevation="sm">
                  <View style={s.userHead}>
                    <Avatar
                      initials={user.avatar}
                      imageUrl={user.avatarUrl}
                      size={44}
                      accent={user.role === 'investor' ? 'reality' : 'dreamer'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={s.userName}>{user.name}</Text>
                      <Text style={s.userMeta}>
                        Requesting <Text style={{ color: palette.accent, fontWeight: Typography.fontWeightBold }}>{r.requestedLevel}</Text> · current: {user.verificationLevel}
                      </Text>
                    </View>
                  </View>
                  <Text style={s.reportDesc}>{r.evidence}</Text>
                  <Text style={s.reportMeta}>{r.createdAt}</Text>
                  {pending ? (
                    <View style={s.reportActions}>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[s.actionBtn, { backgroundColor: palette.success + '14', borderColor: palette.success }]}
                        onPress={() =>
                          safeRun(user.id, 'approve verification', async () => {
                            await usersOps.setVerification(user.id, r.requestedLevel);
                            decideVerification(r.id, 'approved');
                          })
                        }
                      >
                        <CheckCircle2 size={14} color={palette.success} strokeWidth={2.2} />
                        <Text style={[s.actionText, { color: palette.success }]}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        activeOpacity={0.85}
                        style={[s.actionBtn, { backgroundColor: palette.error + '14', borderColor: palette.error }]}
                        onPress={() => decideVerification(r.id, 'rejected')}
                      >
                        <XCircle size={14} color={palette.error} strokeWidth={2.2} />
                        <Text style={[s.actionText, { color: palette.error }]}>Reject</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={[s.statusPill, { borderColor: palette.border, alignSelf: 'flex-start' }]}>
                      <Text style={{ color: palette.textSecondary, fontSize: 10, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 }}>
                        STATUS: {r.status.toUpperCase()}
                      </Text>
                    </View>
                  )}
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      )}

      {tab === 'queue' && (
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={queueRefreshing}
              onRefresh={refreshQueue}
              tintColor={palette.admin}
              colors={[palette.admin]}
            />
          }
        >
          {queue.length === 0 ? (
            <EmptyState
              icon={<Inbox size={28} color={palette.textSecondary} strokeWidth={2} />}
              title="Queue is clear"
              description="Reality-check posts awaiting review land here. Pull down to refresh."
            />
          ) : (
            queue.map((p) => (
              <PendingPostCard
                key={p.id}
                palette={palette}
                post={p}
                onApprove={() => approvePost(p.id)}
                onReject={(reason) => rejectPost(p.id, reason || undefined)}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
};

const PendingPostCard: React.FC<{
  palette: ReturnType<typeof useTheme>['palette'];
  post: ShowcasePost;
  onApprove: () => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}> = ({ palette, post, onApprove, onReject }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const s = styles(palette);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e: any) {
      Alert.alert(`Couldn't ${label}`, e?.message ?? 'Unknown error.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard style={s.reportCard} elevation="sm">
      <View style={s.reportHeadRow}>
        <Text style={s.reportTitle} numberOfLines={1}>{post.milestoneTitle}</Text>
        <View style={[s.statusPill, { borderColor: palette.warning, backgroundColor: palette.warning + '22' }]}>
          <Text style={{ color: palette.warning, fontSize: 10, fontWeight: Typography.fontWeightBold, letterSpacing: 0.5 }}>
            PENDING
          </Text>
        </View>
      </View>
      <Text style={s.reportMeta}>{post.userName} · {post.industry} · {post.createdAt}</Text>
      <Text style={s.reportDesc} numberOfLines={5}>{post.description}</Text>
      {post.metric && (
        <Text style={[s.reportMeta, { color: palette.accent, fontWeight: Typography.fontWeightBold }]}>
          {post.metric.label}: {post.metric.value}{post.metric.unit ? ` ${post.metric.unit}` : ''}
        </Text>
      )}
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Optional reason — shown to the author if rejected"
        placeholderTextColor={palette.textMuted}
        editable={!busy}
        style={[s.reasonInput, { color: palette.textPrimary, backgroundColor: palette.surface, borderColor: palette.border }]}
      />
      <View style={s.reportActions}>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          style={[s.actionBtn, { backgroundColor: palette.success + '14', borderColor: palette.success, opacity: busy ? 0.5 : 1 }]}
          onPress={() => run('approve post', onApprove)}
        >
          <CheckCircle2 size={14} color={palette.success} strokeWidth={2.2} />
          <Text style={[s.actionText, { color: palette.success }]}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          disabled={busy}
          style={[s.actionBtn, { backgroundColor: palette.error + '14', borderColor: palette.error, opacity: busy ? 0.5 : 1 }]}
          onPress={() => run('reject post', () => onReject(reason.trim()))}
        >
          <XCircle size={14} color={palette.error} strokeWidth={2.2} />
          <Text style={[s.actionText, { color: palette.error }]}>Reject</Text>
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
};

const KpiCard: React.FC<{ palette: any; icon: React.ReactNode; label: string; value: number; accent: string }> = ({
  palette,
  icon,
  label,
  value,
  accent,
}) => (
  <View
    style={{
      flex: 1,
      minWidth: 140,
      borderRadius: Radii.lg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: palette.border,
      backgroundColor: palette.card,
      padding: Spacing.md,
      gap: 6,
      ...elevationFor(palette, 'sm'),
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: accent + '18' }}>
        {icon}
      </View>
      <Text style={{ color: palette.textMuted, fontSize: 11, fontWeight: Typography.fontWeightSemiBold, letterSpacing: 0.4, textTransform: 'uppercase' }}>
        {label}
      </Text>
    </View>
    <Text style={{ color: palette.textPrimary, fontSize: Typography.fontSize2XL, fontWeight: Typography.fontWeightBlack, letterSpacing: -0.6 }}>
      {value}
    </Text>
  </View>
);

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.xl,
      paddingTop: Spacing.sm,
      paddingBottom: Spacing.md,
    },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: StyleSheet.hairlineWidth,
    },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeXL,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: -0.4,
    },
    subtitle: {
      color: p.textMuted,
      fontSize: Typography.fontSizeXS,
      marginTop: 2,
    },
    tabsRow: {
      flexDirection: 'row',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
      gap: 6,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: Typography.fontWeightBold,
      letterSpacing: 0.2,
    },
    tabBadge: {
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      paddingHorizontal: 4,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 2,
    },
    tabBadgeText: { fontSize: 9, fontWeight: Typography.fontWeightBlack },
    content: { padding: Spacing.lg, paddingBottom: Spacing.xxxl, gap: Spacing.md },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
    sectionCard: { padding: Spacing.md, gap: Spacing.sm },
    sectionTitle: {
      color: p.textSecondary,
      fontSize: 11,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    distroList: { gap: Spacing.sm },
    distroRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    distroLabel: { color: p.textPrimary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightMedium },
    distroBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
    distroFill: { height: '100%', borderRadius: 3 },
    distroVal: { color: p.textPrimary, fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, width: 32, textAlign: 'right' },
    miniGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    miniItem: { width: '50%', paddingVertical: 6, gap: 2 },
    miniValue: { fontSize: Typography.fontSizeXL, fontWeight: Typography.fontWeightBlack, letterSpacing: -0.4 },
    miniLabel: { color: p.textMuted, fontSize: 11, fontWeight: Typography.fontWeightMedium },
    searchRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
    search: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    searchInput: { flex: 1, fontSize: Typography.fontSizeSM, padding: 0 },
    filterRow: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: 6 },
    filterChip: {
      paddingHorizontal: Spacing.md,
      paddingVertical: 6,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    userCard: { padding: Spacing.md, gap: Spacing.md, marginBottom: Spacing.sm },
    userHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    userName: { color: p.textPrimary, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold },
    userMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    userControls: { gap: Spacing.md },
    controlGroup: { gap: 6 },
    controlLabel: {
      color: p.textMuted,
      fontSize: 10,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    chipRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    chip: {
      paddingHorizontal: Spacing.sm + 2,
      paddingVertical: 6,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: p.border,
      backgroundColor: p.surface,
    },
    chipText: { color: p.textSecondary, fontSize: 11, fontWeight: Typography.fontWeightSemiBold, letterSpacing: 0.3 },
    suspendBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.full,
      borderWidth: 1,
    },
    suspendText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, letterSpacing: 0.3 },
    reportCard: { padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
    reportHeadRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, justifyContent: 'space-between' },
    reportTitle: { color: p.textPrimary, fontSize: Typography.fontSizeMD, fontWeight: Typography.fontWeightBold, flex: 1 },
    reportMeta: { color: p.textMuted, fontSize: Typography.fontSizeXS },
    reportDesc: { color: p.textSecondary, fontSize: Typography.fontSizeSM, lineHeight: 19 },
    statusPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radii.full,
      borderWidth: StyleSheet.hairlineWidth,
    },
    reasonBox: {
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      padding: Spacing.sm,
      gap: 2,
    },
    reasonLabel: {
      fontSize: 10,
      fontWeight: Typography.fontWeightBlack,
      letterSpacing: 0.8,
    },
    reasonText: { fontSize: Typography.fontSizeSM, lineHeight: 18 },
    reasonInput: {
      borderRadius: Radii.md,
      borderWidth: StyleSheet.hairlineWidth,
      paddingHorizontal: Spacing.sm,
      paddingVertical: Spacing.sm,
      fontSize: Typography.fontSizeSM,
    },
    reportActions: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: Spacing.sm + 2,
      borderRadius: Radii.md,
      borderWidth: 1,
    },
    actionText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightBold, letterSpacing: 0.3 },
  });
