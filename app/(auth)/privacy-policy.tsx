import { StyleSheet, View } from 'react-native';

import { AnimatedEntrance } from '@/src/components/ui/AnimatedEntrance';
import { AppText } from '@/src/components/ui/AppText';
import { AuthHeader } from '@/src/components/ui/AuthHeader';
import { Screen } from '@/src/components/ui/Screen';
import { spacing, useAppTheme } from '@/src/theme';

type PolicySection = {
  title: string;
  paragraphs: string[];
};

const sections: PolicySection[] = [
  {
    title: 'Information we collect',
    paragraphs: [
      'We collect the account details you provide, such as your name, email address, phone number, account type and trusted emergency contact.',
      'When you use TaskGrid, we may also collect task descriptions, service preferences, approximate or precise location, messages, ratings, reviews, dispute details, transaction references and basic device or activity information.',
    ],
  },
  {
    title: 'Identity and trust checks',
    paragraphs: [
      'Identity verification may require an approved identity document, a selfie and a liveness check. Our verification provider, Dojah, processes this information to confirm identity and reduce fraud.',
      'TaskGrid is designed to retain the verification reference, status, masked identity value and relevant match scores—not your raw NIN or BVN. Verification decisions may be reviewed or appealed where appropriate.',
    ],
  },
  {
    title: 'AI, voice and matching',
    paragraphs: [
      'If you use voice-to-task, your device may convert your speech into text. TaskGrid can use the resulting text to prepare a task draft and ask for missing details. Raw audio should not be retained unless we clearly ask for permission.',
      'Matching tools use details such as task type, location, worker skills, availability, ratings and work history. AI assists these features, but users should receive clear information and a way to report or challenge an unfair outcome.',
    ],
  },
  {
    title: 'Payments and escrow',
    paragraphs: [
      'We use payment information to fund escrow, confirm completion, release worker payments, issue refunds and resolve disputes. Paystack processes payment credentials. TaskGrid should retain transaction references and statuses rather than full card details.',
      'TaskGrid aims to keep fees and payment rules clear. Payment should be released promptly after confirmed completion, subject to an active dispute or a lawful hold.',
    ],
  },
  {
    title: 'Location and emergency safety',
    paragraphs: [
      'Location helps show relevant nearby tasks, support geofencing and improve matching. You can control location permission through your device, although some nearby-task features may then be unavailable.',
      'If you activate an emergency feature, limited account, task or location information may be shared with your chosen trusted contact and authorised TaskGrid safety personnel. Please obtain your contact’s permission before adding their details.',
    ],
  },
  {
    title: 'How information is shared',
    paragraphs: [
      'Clients and workers receive only the information reasonably needed to arrange and complete a task. Public profile information may include a first name or display name, verification badge, skills, ratings and completed-work history.',
      'We may share necessary data with providers supporting identity checks, payments, email, notifications, maps, AI processing and emergency messages. We may also disclose information to investigate abuse, protect users, resolve disputes or comply with law.',
      'TaskGrid does not sell your personal information.',
    ],
  },
  {
    title: 'Retention and protection',
    paragraphs: [
      'We keep information only for as long as it is needed to operate your account, protect payments, handle disputes, prevent fraud and meet legal or financial record-keeping requirements.',
      'We use access controls, secure authentication and other reasonable safeguards. No online service can promise absolute security, so suspected account misuse should be reported promptly.',
    ],
  },
  {
    title: 'Your choices',
    paragraphs: [
      'You may request access to or correction of your account information, change optional permissions and ask for account deletion. Some transaction, safety or dispute records may need to be retained for legal or legitimate protection purposes.',
      'If we make important changes to this policy, we will explain them in the app.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const { colors } = useAppTheme();

  return (
    <Screen contentStyle={styles.screen}>
      <AuthHeader title="Privacy Policy" subtitle="How we handle your information" />
      <AnimatedEntrance style={styles.content}>
        <View style={styles.intro}>
          <AppText color={colors.textSecondary}>
            TaskGrid uses your information to connect clients with local workers, keep accounts
            secure and support payments. Here is what that means for you.
          </AppText>
          <AppText variant="caption" color={colors.textMuted}>
            Last updated: 8 September 2026
          </AppText>
        </View>

        {sections.map((section, index) => (
          <View key={section.title} style={styles.section}>
            <AppText variant="subtitle">
              {index + 1}. {section.title}
            </AppText>
            <View style={styles.paragraphs}>
              {section.paragraphs.map((paragraph) => (
                <AppText key={paragraph} color={colors.textSecondary}>
                  {paragraph}
                </AppText>
              ))}
            </View>
          </View>
        ))}
      </AnimatedEntrance>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.sm },
  content: { gap: spacing.xl, paddingBottom: spacing.xl },
  intro: { gap: spacing.sm },
  section: { gap: spacing.sm },
  paragraphs: { gap: spacing.md },
});
