import { StyleSheet } from 'react-native';

const AddScreenStyles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
    },
    userSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    userButton: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 15,
        marginRight: 10,
        minWidth: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    selectedUserName: {
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 8,
        padding: 20,
        width: '90%',
        maxHeight: '80%',
    },
    modalUserItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    modalUserItemCheckboxArea: {
        marginLeft: 15,
    },
    modalUserItemRadioArea: {
        marginRight: 15,
    },
    modalUserName: {
        fontSize: 16,
        flex: 1,
        fontFamily: 'Montserrat',
    },
    modalCloseButton: {
        padding: 10,
        backgroundColor: '#000',
        borderRadius: 5,
        alignItems: 'center',
        marginTop: 15,
    },
    modalCloseButtonText: {
        color: 'white',
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
    createButton: {
        backgroundColor: '#000',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 16,
        marginVertical: 16,
    },
    createButtonText: {
        color: '#fff',
        fontSize: 16,
        fontFamily: 'MontserratBold',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 10,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E53935',
    },
    errorText: {
        color: '#E53935',
        fontSize: 14,
        fontFamily: 'Montserrat',
        textAlign: 'center',
    },
});

export default AddScreenStyles;
