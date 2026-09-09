import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/colors';

const GALLERY_PASS_KEY = '@gallery_password';

export const GalleryLockModal = ({ visible, onUnlock, onCancel }) => {
  const [hasPassword, setHasPassword] = useState(false);
  const [inputPassword, setInputPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSettingMode, setIsSettingMode] = useState(false);

  useEffect(() => {
    if (visible) {
      checkStoredPassword();
      setInputPassword('');
      setConfirmPassword('');
      setErrorMessage('');
      setShowPassword(false);
    }
  }, [visible]);

  const checkStoredPassword = async () => {
    try {
      const stored = await AsyncStorage.getItem(GALLERY_PASS_KEY);
      if (stored) {
        setHasPassword(true);
        setIsSettingMode(false);
      } else {
        setHasPassword(false);
        setIsSettingMode(true);
      }
    } catch (e) {
      console.error('Failed to load gallery password:', e);
    }
  };

  const handleAuthenticate = async () => {
    setErrorMessage('');
    if (isSettingMode) {
      if (!inputPassword || inputPassword.length < 4) {
        setErrorMessage('Password must be at least 4 digits/characters.');
        return;
      }
      if (inputPassword !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please try again.');
        return;
      }
      try {
        await AsyncStorage.setItem(GALLERY_PASS_KEY, inputPassword);
        setHasPassword(true);
        setIsSettingMode(false);
        onUnlock();
      } catch (e) {
        setErrorMessage('Failed to save password.');
      }
    } else {
      try {
        const stored = await AsyncStorage.getItem(GALLERY_PASS_KEY);
        if (inputPassword === stored) {
          onUnlock();
        } else {
          setErrorMessage('Incorrect password. Please try again.');
          setInputPassword('');
        }
      } catch (e) {
        setErrorMessage('Authentication error.');
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={isSettingMode ? 'key' : 'lock-closed'}
              size={38}
              color={COLORS.primary}
            />
          </View>

          <Text style={styles.title}>
            {isSettingMode ? 'Set Gallery Password' : 'Locked Gallery'}
          </Text>
          <Text style={styles.subtitle}>
            {isSettingMode
              ? 'Create a secure password to protect your private workout photos.'
              : 'Enter your password to access the gallery.'}
          </Text>

          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={isSettingMode ? 'Enter New Password (PIN)' : 'Enter Password'}
              placeholderTextColor={COLORS.textSecondary}
              secureTextEntry={!showPassword}
              value={inputPassword}
              onChangeText={(txt) => {
                setInputPassword(txt);
                setErrorMessage('');
              }}
              keyboardType="numeric"
              maxLength={8}
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword((prev) => !prev)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password Input (Only when setting new password) */}
          {isSettingMode ? (
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(txt) => {
                  setConfirmPassword(txt);
                  setErrorMessage('');
                }}
                keyboardType="numeric"
                maxLength={8}
              />
            </View>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.buttonRow}>
            {onCancel ? (
              <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity style={styles.submitBtn} onPress={handleAuthenticate} activeOpacity={0.7}>
              <Text style={styles.submitBtnText}>
                {isSettingMode ? 'Set & Open' : 'Unlock'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 87, 34, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 15,
  },
  submitBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
});
