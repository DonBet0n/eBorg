import { StyleSheet } from 'react-native';

const detailsStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    width: '95%',
    maxHeight: '90%',
    marginTop: '-15%',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'MontserratBold',
  },
  modalSubtitle: {
    fontSize: 24,
    color: '#666', // це буде колір за замовчуванням для нульового балансу
    fontFamily: 'Montserrat',
  },
  modalScroll: {
    maxHeight: 'auto',
  },
  modalItem: {
    padding: 8,
    marginBottom: 8, // Додаємо відступ знизу замість лінії
  },
  modalItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalItemText: {
    fontSize: 16, // Зменшено з 18
    fontFamily: 'Montserrat',
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  modalItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalItemPrice: {
    fontSize: 16,
    fontFamily: 'MontserratBold',
  },
  modalItemAmount: {
    fontSize: 14, // Зменшено з 16
    fontFamily: 'MontserratBold',
  },
  modalItemDate: {
    fontSize: 14, // Збільшено з 12
    color: '#999',
    fontFamily: 'Montserrat',
  },
  modalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#000',
  },
  modalTotalText: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
  },
  modalTotalAmount: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
  },
  modalCloseButton: {
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'MontserratBold',
  },
  paymentText: {
    fontFamily: 'MontserratBold',
    color: '#666',
  },
  paymentAmount: {
    fontFamily: 'Montserrat',
    color: '#000000',
  },
  modalGroupDate: {
    fontSize: 14,
    fontFamily: 'MontserratBold',
    color: '#666',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  modalGroupContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    
  },
  modalGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8, // Зменшено з 12
    backgroundColor: '#F5F5F5',
  },
  modalGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  modalGroupTotal: {
    fontSize: 18, // Зменшено з 16
    fontFamily: 'MontserratBold',
  },
  modalSubItemsContainer: {
    overflow: 'hidden',
  },
  modalSubItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8, // Зменшено з 12
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  modalItemInfo: {
    alignItems: 'flex-end',
  },
  modalSubItemWithCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
  },
  checkbox: {
    padding: 8,
    marginRight: 8,
  },
  modalFooter: {
    marginTop: 20,
  },
  modalButtonDisabled: {
    opacity: 0.5,
  },
  selectAllContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  selectAllText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
    fontFamily: 'Montserrat',
  },
  noDataText: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Montserrat',
    textAlign: 'center',
    marginTop: 16,
    padding: 20,
  },
});

export default detailsStyles;
