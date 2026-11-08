import { Linking, Text, View } from 'react-native';
import { privacySections, SUPPORT_URL } from '../../content/privacy';
import { AppHeader } from '../../ui/account';
import { Button, Page } from '../../ui/components';
import { S } from '../../ui/theme';
export default function Privacy() {
  return (
    <Page>
      <AppHeader back title="Your data" />
      <Text style={S.title}>Your practice.\nYour call.</Text>
      <Text style={S.text}>What we store, why, and how to remove it.</Text>
      {privacySections.map(([title, copy]) => (
        <View key={title} style={[S.card, { gap: 9 }]}>
          <Text style={S.sectionTitle}>{title}</Text>
          <Text style={S.text}>{copy}</Text>
        </View>
      ))}
      <Button
        title="Contact Wentao privately"
        secondary
        onPress={() => {
          void Linking.openURL(SUPPORT_URL);
        }}
      />
    </Page>
  );
}
