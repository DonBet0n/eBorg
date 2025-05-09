import { StyleSheet } from 'react-native';

const authStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 50,
  },
  logo: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'MontserratBold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    fontFamily: 'Montserrat',
  },
  formContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontFamily: 'Montserrat',
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'MontserratBold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchButtonText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'Montserrat',
  },
  switchButtonTextHighlight: {
    color: '#000',
    fontSize: 14,
    fontFamily: 'MontserratBold',
  },
});

export default authStyles;
