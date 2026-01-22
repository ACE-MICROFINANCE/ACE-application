import { Audio } from 'expo-av';

let sound: Audio.Sound | null = null;

export const stopTts = async () => {
  try {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  } catch {
    // ignore
  } finally {
    sound = null;
  }
};

export const playTtsUrl = async (url: string) => {
  if (!url) return;
  await stopTts();
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
  });

  const { sound: newSound } = await Audio.Sound.createAsync(
    { uri: url },
    { shouldPlay: true },
  );
  sound = newSound;
};
