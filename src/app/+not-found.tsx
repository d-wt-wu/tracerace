import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../ui/components';
import { S } from '../ui/theme';
export default function NotFound() {
  return (
    <View style={[S.screen, S.content, { justifyContent: 'center' }]}>
      <Text style={S.title}>A small wrong turn.</Text>
      <Text style={S.text}>That page isn’t part of this learning path.</Text>
      <Button title="Back to Today" onPress={() => router.replace('/')} />
    </View>
  );
}
