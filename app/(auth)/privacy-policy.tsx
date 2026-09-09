import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Screen } from '@/src/components/ui/Screen';
import { radius, shadows, spacing, useAppTheme } from '@/src/theme';

type PolicySection = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  paragraphs: string[];
};

const sections: PolicySection[] = [
  {
    icon: 'folder-open-outline',
    title: 'Information we collect',
    paragraphs: [
      'We collect the account details you provide, such as your name, email address, phone number, account type and trusted emergency contact.',
      'When you use TaskGrid, we may also collect task descriptions, service preferences, approximate or precise location, messages, ratings, reviews, dispute details, transaction references and basic device or activity information.',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Identity and trust checks',
    paragraphs: [
      'Identity verification may require an approved identity document, a selfie and a liveness check. Our verification provider, Dojah, processes this information to confirm identity and reduce fraud.',
      'TaskGrid is designed to retain the verification reference, status, masked identity value and relevant match scores—not your raw NIN or BVN. Verification decisions may be reviewed or appealed where appropriate.',
    ],
  },
  {
    icon: 'sparkles-outline',
    title: 'AI, voice and matching',
    paragraphs: [
      'If you use voice-to-task, your device may convert your speech into text. TaskGrid can use the resulting text to prepare a task draft and ask for missing details. Raw audio should not be retained unless we clearly ask for permission.',
      'Matching tools use details such as task type, location, worker skills, availability, ratings and work history. AI assists these features, but users should receive clear information and a way to report or challenge an unfair outcome.',
    ],
  },
  {
    icon: 'card-outline',
    title: 'Payments and escrow',
    paragraphs: [
      'We use payment information to fund escrow, confirm completion, release worker payments, issue refunds and resolve disputes. Paystack processes payment credentials; TaskGrid should retain transaction references and statuses rather than full card details.',
      'TaskGrid aims to keep fees and payment rules clear. Payment should be released promptly after confirmed completion, subject to an active dispute or a lawful hold.',
    ],
  },
  {
    icon: 'location-outline',
    title: 'Location and emergency safety',
    paragraphs: [
      'Location helps show relevant nearby tasks, support geofencing and improve matching. You can control location permission through your device, although some nearby-task features may then be unavailable.',
      'If you activate an emergency feature, limited account, task or location information may be shared with your chosen trusted contact and authorised TaskGrid safety personnel. Please obtain your contact’s permission before adding their details.',
    ],
  },
  {
    icon: 'people-outline',
    title: 'How information is shared',
    paragraphs: [
      'Clients and workers receive only the information reasonably needed to arrange and complete a task. Public profile information may include a first name or display name, verification badge, skills, ratings and completed-work history.',
      'We may share necessary data with providers supporting identity checks, payments, email, notifications, maps, AI processing and emergency messages. We may also disclose information to investigate abuse, protect users, resolve disputes or comply with law.',
      'TaskGrid does not sell your personal information.',
    ],
  },
  {
    icon: 'time-outline',
    title: 'Retention and protection',
    paragraphs: [
      'We keep information only for as long as it is needed to operate your account, protect payments, handle disputes, prevent fraud and meet legal or financial record-keeping requirements.',
      'We use access controls, secure authentication and other reasonable safeguards. No online service can promise absolute security, so suspected account misuse should be reported promptly.',
    ],
  },
  {
    icon: 'options-outline',
    title: 'Your choices',
    paragraphs: [
      'You may request access to or correction of your account information, change optional permissions and ask for account deletion. Some transaction, safety or dispute records may need to be retained for legal or legitimate protection purposes.',
      'A privacy contact and final legal terms will be added before TaskGrid is released publicly. Material policy changes should be explained in the app before they take effect.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useAppTheme();

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader title="Privacy Policy" subtitle="Development draft" />
      <AnimatedEntrance style={styles.content}>
        <View
          style={[
            styles.introCard,
            { backgroundColor: colors.primarySoft, borderColor: colors.primary },
          ]}
        >
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="lock-closed-outline" size={25} color={colors.textOnPrimary} />
          </View>
          <View style={styles.introCopy}>
            <AppText variant="title">Your data, explained clearly</AppText>
            <AppText color={colors.textSecondary}>
              This draft explains how TaskGrid intends to handle information while connecting
              clients with trusted local workers.
            </AppText>
            <AppText variant="caption" color={colors.textMuted}>
              Last updated: 8 September 2026
            </AppText>
          </View>
        </View>

        {sections.map((section, index) => (
          <View
            key={section.title}
            style={[
              styles.section,
              { backgroundColor: colors.surface, borderColor: colors.border },
              shadows.card,
            ]}
          >
            <View style={styles.sectionHeading}>
              <View style={[styles.sectionIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name={section.icon} size={19} color={colors.primary} />
              </View>
              <AppText variant="subtitle" style={styles.sectionTitle}>
                {index + 1}. {section.title}
              </AppText>
            </View>
            <View style={styles.paragraphs}>
              {section.paragraphs.map((paragraph) => (
                <AppText key={paragraph} color={colors.textSecondary}>
                  {paragraph}
                </AppText>
              ))}
            </View>
          </View>
        ))}

        <View style={[styles.draftNote, { backgroundColor: colors.warningSoft }]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.warning} />
          <AppText variant="caption" color={colors.textSecondary} style={styles.draftText}>
            This is a project-development policy, not the final production legal document. It must
            be reviewed before public launch.
          </AppText>
        </View>
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  introCard: {
    borderWidth: 1,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introCopy: { gap: spacing.sm },
  section: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  sectionIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { flex: 1 },
  paragraphs: { gap: spacing.md },
  draftNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  draftText: { flex: 1 },
});
