import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: 'white',
    },
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        paddingTop: 20,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    tabBar: {
        flexDirection: 'row',
        marginHorizontal: 16,
        //marginBottom: 20,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 15,
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    activeTabButton: {
        backgroundColor: '#000',
    },
    tabButtonText: {
        fontSize: 16,
        color: '#666',
        fontFamily: 'Montserrat',
    },
    activeTabButtonText: {
        color: '#fff',
        fontFamily: 'MontserratBold',
    },
    soloTabContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    multyTabContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    personSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    personText: {
        fontSize: 30,
        fontWeight: 'bold',
        marginHorizontal: 10,
    },
    reverseArrows: {
        flexDirection: 'column',
        marginLeft: 10,
        opacity: 0.5,
    },
    debtItemList: {
        marginBottom: 10,
        flexGrow: 1,
    },
    bottomContainer: {
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
    },
    totalText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    totalValueContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        marginRight: 5,
    },
    currency: {
        fontSize: 16,
        color: 'grey',
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

    // --- Styles for Multy Tab & Solo User Selectors ---
    multyUserSelectorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    multyUserSelectorContainerSolo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    multyUserButton: {
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
    multyAllUsersText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    multyTotalRow: {
        marginBottom: 15,
        //paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    multyUserSection: {
        marginBottom: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    multyUserRowHeader: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    multyUserLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    multyTotalLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    multyTotalLabelText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
    },
    multyUserNameText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 5,
        marginBottom: 5,
    },
    multySummaryText: {
        fontSize: 14,
        color: 'grey',
        marginRight: 10,
    },
    multyDebtText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    multyItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        //paddingBottom: 8,
    },
    multyTextInput: {
        flex: 1,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        fontFamily: 'Montserrat',
    },
    multyNumberInput: {
        width: 80,
        height: 50,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        textAlign: 'center',
        fontFamily: 'Montserrat',
    },
    multyAddButton: {
        padding: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 0,
        alignItems: 'center',
        marginTop: 4,
    },
    multyDeleteButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    multyCreateButton: {
        marginBottom: 15,
    },

    // --- New style for selected user name in Solo Tab ---
    selectedUserName: {
        fontSize: 16,
        fontWeight: 'bold',
    },

    // --- Новий стиль для контейнера Summary та Debt ---
    summaryDebtContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    // --- Modal Styles ---
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
    },
    multyTotalHeader: {
        marginBottom: 10,
    },
});

export default styles;