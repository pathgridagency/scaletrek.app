import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { ChevronLeft, ImagePlus, Camera, X, Plus, Zap, Target, Handshake } from 'lucide-react-native';
import { Radii, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../theme/ThemeContext';
import { useAuthStore } from '../store/useAuthStore';
import { Screen } from '../components/ui/Screen';
import { TextField } from '../components/ui/TextField';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { uploadProfilePhoto } from '../lib/sync/profilePhotos';
import { useTranslation } from '../i18n';

interface Props {
  onClose: () => void;
}

// Inline tag editor for Synergy Match strengths / bottlenecks.
const TagEditor: React.FC<{
  icon: React.ReactNode;
  color: string;
  bg: string;
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}> = ({ icon, color, bg, tags, onChange, placeholder }) => {
  const { palette } = useTheme();
  const [draft, setDraft] = useState('');
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!tags.some((t) => t.toLowerCase() === v.toLowerCase())) onChange([...tags, v]);
    setDraft('');
  };
  return (
    <View style={{ gap: Spacing.sm }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          backgroundColor: palette.surface,
          borderRadius: Radii.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: palette.border,
          paddingLeft: Spacing.md,
        }}
      >
        {icon}
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          placeholder={placeholder}
          placeholderTextColor={palette.textDim}
          returnKeyType="done"
          style={{ flex: 1, color: palette.textPrimary, fontSize: Typography.fontSizeSM, paddingVertical: Spacing.md }}
        />
        <TouchableOpacity onPress={add} style={{ padding: Spacing.md }} activeOpacity={0.7}>
          <Plus size={18} color={color} strokeWidth={2.6} />
        </TouchableOpacity>
      </View>
      {tags.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {tags.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => onChange(tags.filter((x) => x !== t))}
              activeOpacity={0.7}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: bg,
                borderRadius: Radii.full,
                paddingLeft: Spacing.md,
                paddingRight: Spacing.sm,
                paddingVertical: 6,
              }}
            >
              <Text style={{ color, fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold }}>
                {t}
              </Text>
              <X size={11} color={color} strokeWidth={2.6} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

export const EditProfileScreen: React.FC<Props> = ({ onClose }) => {
  const { palette } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [industry, setIndustry] = useState(user?.industry ?? '');
  const [initials, setInitials] = useState(user?.avatar ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [coverUrl, setCoverUrl] = useState(user?.coverUrl ?? '');
  const [headline, setHeadline] = useState(user?.headline ?? '');
  const [location, setLocation] = useState(user?.location ?? '');
  const [website, setWebsite] = useState(user?.website ?? '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedinUrl ?? '');
  const [twitterUrl, setTwitterUrl] = useState(user?.twitterUrl ?? '');
  const [instagramUrl, setInstagramUrl] = useState(user?.instagramUrl ?? '');
  const [githubUrl, setGithubUrl] = useState(user?.githubUrl ?? '');
  const [facebookUrl, setFacebookUrl] = useState(user?.facebookUrl ?? '');
  const [companyName, setCompanyName] = useState(user?.companyName ?? '');
  const [sector, setSector] = useState(user?.sector ?? '');
  const [foundedYear, setFoundedYear] = useState(user?.foundedYear ? String(user.foundedYear) : '');
  const [teamSize, setTeamSize] = useState(user?.teamSize ?? '');
  const [mode, setMode] = useState<'personal' | 'business'>(user?.companyName ? 'business' : 'personal');
  const [revealToAll, setRevealToAll] = useState(user?.revealToAll ?? false);
  const [strengths, setStrengths] = useState<string[]>(user?.strengths ?? []);
  const [bottlenecks, setBottlenecks] = useState<string[]>(user?.bottlenecks ?? []);
  const [openToSynergy, setOpenToSynergy] = useState(user?.openToSynergy ?? false);
  const [synergyHours, setSynergyHours] = useState(
    user?.synergyHoursPerWeek ? String(user.synergyHoursPerWeek) : '',
  );
  const [synergyEquity, setSynergyEquity] = useState(user?.synergyEquityExpectation ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const s = styles(palette);

  if (!user) return null;

  const pickImage = async (kind: 'avatar' | 'cover') => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Permission to access photos was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: kind === 'avatar' ? [1, 1] : [16, 9],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setError(null);
    const setBusy = kind === 'avatar' ? setUploadingAvatar : setUploadingCover;
    setBusy(true);
    try {
      const url = await uploadProfilePhoto(
        kind === 'avatar' ? 'avatars' : 'profile-covers',
        asset.uri,
      );
      if (kind === 'avatar') setAvatarUrl(url);
      else setCoverUrl(url);
    } catch (err: any) {
      console.warn('[edit-profile] upload failed', err);
      const msg = err?.message ?? String(err);
      setError(`Upload failed: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!name.trim() || !username.trim()) {
      setError('Name and username are required.');
      return;
    }
    const year = foundedYear.trim() ? Number.parseInt(foundedYear, 10) : undefined;
    updateUser({
      name: name.trim(),
      username: username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`,
      bio: bio.trim(),
      industry: industry.trim() || undefined,
      avatar: (initials.trim() || name.trim().slice(0, 2)).toUpperCase().slice(0, 3),
      avatarUrl: avatarUrl || undefined,
      coverUrl: coverUrl || undefined,
      headline: headline.trim() || undefined,
      location: location.trim() || undefined,
      website: website.trim() || undefined,
      linkedinUrl: linkedinUrl.trim() || undefined,
      twitterUrl: twitterUrl.trim() || undefined,
      instagramUrl: instagramUrl.trim() || undefined,
      githubUrl: githubUrl.trim() || undefined,
      facebookUrl: facebookUrl.trim() || undefined,
      companyName: mode === 'business' ? companyName.trim() || undefined : undefined,
      sector: mode === 'business' ? sector.trim() || undefined : undefined,
      foundedYear: mode === 'business' && year && !Number.isNaN(year) ? year : undefined,
      teamSize: mode === 'business' ? teamSize.trim() || undefined : undefined,
      strengths,
      bottlenecks,
      openToSynergy,
      synergyHoursPerWeek: synergyHours.trim()
        ? Number.parseInt(synergyHours, 10) || undefined
        : undefined,
      synergyEquityExpectation: synergyEquity.trim() || undefined,
      ...(user.role === 'investor' ? { revealToAll } : {}),
    });
    onClose();
  };

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.back}>
            <ChevronLeft size={20} color={palette.textSecondary} />
            <Text style={s.backText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
          <Text style={s.title}>{t('profile.edit')}</Text>
          <View style={{ width: 80 }} />
        </View>

        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Cover */}
          <TouchableOpacity
            style={[s.coverWrap, { borderColor: palette.border }]}
            onPress={() => pickImage('cover')}
            activeOpacity={0.85}
            disabled={uploadingCover}
          >
            {coverUrl ? (
              <Image source={{ uri: coverUrl }} style={s.coverImg} contentFit="cover" />
            ) : (
              <View style={[s.coverPlaceholder, { backgroundColor: palette.surface }]} />
            )}
            <View style={s.coverOverlay}>
              {uploadingCover ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Camera size={16} color="#fff" strokeWidth={1.8} />
                  <Text style={s.coverOverlayText}>{t('profile.cover')}</Text>
                </>
              )}
            </View>
            {coverUrl ? (
              <TouchableOpacity
                style={s.removeBadge}
                onPress={() => setCoverUrl('')}
                activeOpacity={0.85}
              >
                <X size={12} color="#fff" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : null}
          </TouchableOpacity>

          {/* Avatar */}
          <View style={s.avatarRow}>
            <TouchableOpacity onPress={() => pickImage('avatar')} disabled={uploadingAvatar} activeOpacity={0.85}>
              {avatarUrl ? (
                <View style={s.avatarPickerWrap}>
                  <Image source={{ uri: avatarUrl }} style={s.avatarImg} contentFit="cover" />
                  <View style={[s.avatarBadge, { backgroundColor: palette.accent }]}>
                    <Camera size={12} color="#fff" strokeWidth={2} />
                  </View>
                </View>
              ) : (
                <View style={s.avatarPickerWrap}>
                  <Avatar
                    initials={(initials || name).toUpperCase().slice(0, 3)}
                    size={88}
                    accent={user.role === 'admin' ? 'admin' : user.role === 'investor' ? 'reality' : 'dreamer'}
                  />
                  <View style={[s.avatarBadge, { backgroundColor: palette.accent }]}>
                    {uploadingAvatar ? <ActivityIndicator color="#fff" size="small" /> : <ImagePlus size={12} color="#fff" strokeWidth={2} />}
                  </View>
                </View>
              )}
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity onPress={() => setAvatarUrl('')} style={s.avatarRemoveLink}>
                <Text style={[s.avatarRemoveText, { color: palette.error }]}>{t('profile.removeImage')}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TextField
            label="Avatar initials (fallback, 1-3 chars)"
            value={initials}
            onChangeText={setInitials}
            maxLength={3}
            autoCapitalize="characters"
          />
          <TextField label={t('auth.name')} value={name} onChangeText={setName} />
          <TextField label="Username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextField label={t('profile.headline')} value={headline} onChangeText={setHeadline} placeholder="Founder · FinTech MENA" />
          <TextField
            label={t('profile.bio')}
            value={bio}
            onChangeText={setBio}
            multiline
            style={{ minHeight: 80, textAlignVertical: 'top' }}
            placeholder="One sentence about what you're building."
          />
          <TextField label={t('profile.location')} value={location} onChangeText={setLocation} placeholder="Casablanca, Morocco" />
          <TextField label={t('profile.website')} value={website} onChangeText={setWebsite} placeholder="https://" autoCapitalize="none" keyboardType="url" />

          {/* Mode toggle */}
          <View style={s.modeRow}>
            {(['personal', 'business'] as const).map((m) => {
              const active = m === mode;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    s.modeBtn,
                    {
                      borderColor: active ? palette.accent : palette.border,
                      backgroundColor: active ? palette.accentSubtle : palette.card,
                    },
                  ]}
                  onPress={() => setMode(m)}
                  activeOpacity={0.85}
                >
                  <Text style={[s.modeText, { color: active ? palette.accent : palette.textSecondary }]}>
                    {m === 'personal' ? t('profile.personal') : t('profile.business')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'business' && (
            <>
              <TextField label={t('profile.companyName')} value={companyName} onChangeText={setCompanyName} />
              <TextField label={t('profile.sector')} value={sector} onChangeText={setSector} placeholder="FinTech / AgriTech / ..." />
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <TextField label={t('profile.foundedYear')} value={foundedYear} onChangeText={setFoundedYear} keyboardType="numeric" maxLength={4} />
                </View>
                <View style={{ flex: 1 }}>
                  <TextField label={t('profile.teamSize')} value={teamSize} onChangeText={setTeamSize} placeholder="1-5, 6-20, 21-50…" />
                </View>
              </View>
            </>
          )}

          <TextField label={t('profile.industry') ?? 'Industry'} value={industry} onChangeText={setIndustry} placeholder="FinTech, AgriTech, ..." />

          <Text style={s.sectionLabel}>{t('profile.socials')}</Text>
          <TextField label="LinkedIn" value={linkedinUrl} onChangeText={setLinkedinUrl} autoCapitalize="none" keyboardType="url" placeholder="https://linkedin.com/in/…" />
          <TextField label="Twitter / X" value={twitterUrl} onChangeText={setTwitterUrl} autoCapitalize="none" keyboardType="url" placeholder="https://x.com/…" />
          <TextField label="Instagram" value={instagramUrl} onChangeText={setInstagramUrl} autoCapitalize="none" keyboardType="url" placeholder="https://instagram.com/…" />
          <TextField label="GitHub" value={githubUrl} onChangeText={setGithubUrl} autoCapitalize="none" keyboardType="url" placeholder="https://github.com/…" />
          <TextField label="Facebook" value={facebookUrl} onChangeText={setFacebookUrl} autoCapitalize="none" keyboardType="url" placeholder="https://facebook.com/…" />

          {user.role === 'investor' && (
            <View style={s.privacyCard}>
              <View style={s.privacyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.privacyTitle}>Reveal identity to everyone</Text>
                  <Text style={s.privacyHint}>
                    Off by default. When off, founders see your alias until you
                    engage with them or open a deal.
                  </Text>
                </View>
                <Switch
                  value={revealToAll}
                  onValueChange={setRevealToAll}
                  trackColor={{ true: palette.accent, false: palette.border }}
                  thumbColor={palette.card}
                />
              </View>
            </View>
          )}

          {/* Synergy Match */}
          <View style={s.synergyHeader}>
            <Handshake size={15} color={palette.accent} strokeWidth={2} />
            <Text style={[s.sectionLabel, { marginTop: 0 }]}>Synergy Match</Text>
          </View>
          <View style={s.privacyCard}>
            <View style={s.privacyRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.privacyTitle}>Open to Synergy</Text>
                <Text style={s.privacyHint}>
                  When on, complementary founders can discover you for a sweat-equity
                  partnership. Needs at least 3 strengths and 1 bottleneck.
                </Text>
              </View>
              <Switch
                value={openToSynergy}
                onValueChange={setOpenToSynergy}
                trackColor={{ true: palette.accent, false: palette.border }}
                thumbColor={palette.card}
              />
            </View>
          </View>

          <Text style={[s.sectionLabel, { marginTop: Spacing.xs }]}>
            My superpowers — what you execute masterfully
          </Text>
          <TagEditor
            icon={<Zap size={16} color={palette.success} strokeWidth={2.4} />}
            color={palette.success}
            bg={palette.realitySubtle}
            tags={strengths}
            onChange={setStrengths}
            placeholder="e.g. Media buying, Supply chain…"
          />

          <Text style={s.sectionLabel}>My bottlenecks — what blocks you from scaling</Text>
          <TagEditor
            icon={<Target size={16} color={palette.warning} strokeWidth={2.4} />}
            color={palette.warning}
            bg={palette.eliteSubtle}
            tags={bottlenecks}
            onChange={setBottlenecks}
            placeholder="e.g. Product sourcing, Fundraising…"
          />

          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <TextField
                label="Hours / week"
                value={synergyHours}
                onChangeText={setSynergyHours}
                keyboardType="numeric"
                maxLength={2}
                placeholder="10"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Equity expectation"
                value={synergyEquity}
                onChangeText={setSynergyEquity}
                placeholder="e.g. 50/50, negotiable"
              />
            </View>
          </View>

          {error && <Text style={s.error}>{error}</Text>}

          <Button label={t('common.save')} onPress={save} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = (p: ReturnType<typeof useTheme>['palette']) =>
  StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      borderBottomWidth: 0.5,
      borderBottomColor: p.border,
    },
    back: { flexDirection: 'row', alignItems: 'center', gap: 2, width: 80 },
    backText: { color: p.textSecondary, fontSize: Typography.fontSizeSM },
    title: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeMD,
      fontWeight: Typography.fontWeightSemiBold,
    },
    scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing.xxxl },
    coverWrap: {
      height: 140,
      borderRadius: Radii.md,
      overflow: 'hidden',
      borderWidth: 0.5,
      position: 'relative',
    },
    coverImg: { width: '100%', height: '100%' },
    coverPlaceholder: { width: '100%', height: '100%' },
    coverOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    coverOverlayText: { color: '#fff', fontSize: 11, fontWeight: Typography.fontWeightSemiBold },
    removeBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.65)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarRow: { alignItems: 'center', gap: 6, paddingVertical: Spacing.sm },
    avatarPickerWrap: { position: 'relative' },
    avatarImg: { width: 88, height: 88, borderRadius: 44, backgroundColor: p.surface },
    avatarBadge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: p.background,
    },
    avatarRemoveLink: { paddingVertical: 4 },
    avatarRemoveText: { fontSize: Typography.fontSizeXS, fontWeight: Typography.fontWeightSemiBold },
    modeRow: { flexDirection: 'row', gap: Spacing.sm },
    modeBtn: {
      flex: 1,
      paddingVertical: Spacing.sm,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      alignItems: 'center',
    },
    modeText: { fontSize: Typography.fontSizeSM, fontWeight: Typography.fontWeightSemiBold },
    row: { flexDirection: 'row', gap: Spacing.sm },
    sectionLabel: {
      color: p.textSecondary,
      fontSize: Typography.fontSizeXS,
      fontWeight: Typography.fontWeightSemiBold,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: Spacing.sm,
    },
    error: { color: p.error, fontSize: Typography.fontSizeSM, textAlign: 'center' },
    synergyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: Spacing.lg,
    },
    privacyCard: {
      padding: Spacing.md,
      borderRadius: Radii.md,
      borderWidth: 0.5,
      borderColor: p.border,
      backgroundColor: p.card,
    },
    privacyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
    privacyTitle: {
      color: p.textPrimary,
      fontSize: Typography.fontSizeSM,
      fontWeight: Typography.fontWeightSemiBold,
    },
    privacyHint: {
      color: p.textMuted,
      fontSize: Typography.fontSizeXS,
      lineHeight: 16,
      marginTop: 2,
    },
  });
