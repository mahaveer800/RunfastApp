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
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS } from '../constants/colors';
import {
  getLocalUser,
  registerUser,
  loginUser,
  verifyGalleryPassword,
} from '../services/authService';

export const GalleryLockModal = ({ visible, onUnlock, onCancel }) => {
  // Modes: 'unlock' (PIN/Pass only), 'signup' (New User Register), 'login' (Other device / Existing User)
  const [authMode, setAuthMode] = useState('unlock');
  const [currentUser, setCurrentUser] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      resetForm();
      checkAuthStatus();
    }
  }, [visible]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setShowPassword(false);
    setIsLoading(false);
  };

  const checkAuthStatus = async () => {
    try {
      const user = await getLocalUser();
      if (user && user.email) {
        setCurrentUser(user);
        setAuthMode('unlock');
      } else {
        setCurrentUser(null);
        setAuthMode('signup');
      }
    } catch (e) {
      setAuthMode('signup');
    }
  };

  const validateEmail = (val) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(val).toLowerCase());
  };

  const handleSubmit = async () => {
    setErrorMessage('');

    // --- MODE 1: UNLOCK WITH PASSWORD ---
    if (authMode === 'unlock') {
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }
      setIsLoading(true);
      try {
        const isValid = await verifyGalleryPassword(password);
        if (isValid) {
          setIsLoading(false);
          onUnlock();
        } else {
          setIsLoading(false);
          setErrorMessage('Incorrect password. Please try again.');
          setPassword('');
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMessage('Error verifying password.');
      }
      return;
    }

    // --- MODE 2: SIGN UP ---
    if (authMode === 'signup') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email.');
        return;
      }
      if (!validateEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password || password.length < 6) {
        setErrorMessage('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match.');
        return;
      }

      setIsLoading(true);
      try {
        await registerUser({
          email: email.trim(),
          password: password.trim(),
          name: name.trim(),
        });
        setIsLoading(false);
        onUnlock();
      } catch (err) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Registration failed. Please try again.');
      }
      return;
    }

    // --- MODE 3: LOGIN (For other device or existing account) ---
    if (authMode === 'login') {
      if (!email.trim()) {
        setErrorMessage('Please enter your email.');
        return;
      }
      if (!validateEmail(email)) {
        setErrorMessage('Please enter a valid email address.');
        return;
      }
      if (!password) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setIsLoading(true);
      try {
        await loginUser({
          email: email.trim(),
          password: password.trim(),
        });
        setIsLoading(false);
        onUnlock();
      } catch (err) {
        setIsLoading(false);
        setErrorMessage(err.message || 'Login failed. Please check your credentials.');
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header Icon */}
            <View style={styles.iconContainer}>
              <Ionicons
                name={
                  authMode === 'signup'
                    ? 'person-add'
                    : authMode === 'login'
                    ? 'log-in'
                    : 'lock-closed'
                }
                size={34}
                color={COLORS.primary}
              />
            </View>

            {/* Title & Subtitle */}
            <Text style={styles.title}>
              {authMode === 'signup'
                ? 'Create Gallery Account'
                : authMode === 'login'
                ? 'Login to Gallery'
                : 'Gallery Locked'}
            </Text>

            <Text style={styles.subtitle}>
              {authMode === 'signup'
                ? 'Register to securely backup and protect your photos across devices.'
                : authMode === 'login'
                ? 'Enter your registered email and password to access your cloud photos.'
                : `Welcome back${currentUser?.email ? ` (${currentUser.email})` : ''}. Enter your password to view gallery.`}
            </Text>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={16} color={COLORS.danger} style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Form Fields: SIGN UP */}
            {authMode === 'signup' && (
              <>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Full Name (Optional)"
                    placeholderTextColor={COLORS.textSecondary}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email Address"
                    placeholderTextColor={COLORS.textSecondary}
                    value={email}
                    onChangeText={(t) => {
                      setEmail(t);
                      setErrorMessage('');
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </>
            )}

            {/* Form Fields: LOGIN */}
            {authMode === 'login' && (
              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Registered Email"
                  placeholderTextColor={COLORS.textSecondary}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    setErrorMessage('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Password Input (All Modes) */}
            <View style={styles.inputWrapper}>
              <Ionicons name="key-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
              <TextInput
                style={styles.input}
                placeholder={
                  authMode === 'signup'
                    ? 'Create Password (min 6 chars)'
                    : 'Enter Password'
                }
                placeholderTextColor={COLORS.textSecondary}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setErrorMessage('');
                }}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword((prev) => !prev)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={19}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password (Only Sign Up) */}
            {authMode === 'signup' && (
              <View style={styles.inputWrapper}>
                <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textSecondary} style={styles.fieldIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    setErrorMessage('');
                  }}
                />
              </View>
            )}

            {/* Mode Switching Buttons */}
            <View style={styles.switchContainer}>
              {authMode === 'unlock' && (
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchText}>
                    Login with another Email / Device?
                  </Text>
                </TouchableOpacity>
              )}

              {authMode === 'signup' && (
                <TouchableOpacity
                  onPress={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchText}>
                    Already have an account? <Text style={styles.switchHighlight}>Login</Text>
                  </Text>
                </TouchableOpacity>
              )}

              {authMode === 'login' && (
                <TouchableOpacity
                  onPress={() => {
                    if (currentUser) {
                      setAuthMode('unlock');
                    } else {
                      setAuthMode('signup');
                    }
                    setErrorMessage('');
                  }}
                  style={styles.switchButton}
                >
                  <Text style={styles.switchText}>
                    {currentUser ? '← Back to Quick Unlock' : 'New user? ' + 'Create an Account'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              {onCancel ? (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onCancel}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleSubmit}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                {isLoading ? (
                  <ActivityIndicator color={COLORS.text} size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {authMode === 'signup'
                      ? 'Sign Up & Open'
                      : authMode === 'login'
                      ? 'Login & Open'
                      : 'Unlock Gallery'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 87, 34, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
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
    marginBottom: 18,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 14,
    width: '100%',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 13,
    flex: 1,
  },
  inputWrapper: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  fieldIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  eyeIcon: {
    padding: 6,
  },
  switchContainer: {
    marginVertical: 10,
    alignItems: 'center',
  },
  switchButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  switchText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  switchHighlight: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    flex: 1.6,
    paddingVertical: 13,
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
