import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, Linking } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { User, DebtItem } from '../types/debt';
import { useAppTheme } from '../contexts/ThemeContext';

interface ParsedItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  total: number;
}

interface QRScannerModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  onAddUserItem?: (userId: string, item: DebtItem) => void;
  onAddTotalItem?: (item: DebtItem) => void;
}

const { height: WINDOW_HEIGHT } = Dimensions.get('window');

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, users, onAddUserItem, onAddTotalItem }) => {
  const { colors, currencySymbol } = useAppTheme();
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState('Завантаження сторінки...');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [expectedSum, setExpectedSum] = useState<number | null>(null);
  const [sumWarning, setSumWarning] = useState<number | null>(null);
  
  // For selecting a user to assign an item
  const [selectedItemToAssign, setSelectedItemToAssign] = useState<ParsedItem | null>(null);

  const requestPermission = async () => {
    const { status, canAskAgain: canAsk } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    setCanAskAgain(canAsk);
  };

  useEffect(() => {
    if (visible) {
      requestPermission();
    } else {
      // Reset state on close
      setScannedUrl(null);
      setIsParsing(false);
      setParsingStatus('Завантаження сторінки...');
      setParsedItems([]);
      setSelectedItemToAssign(null);
      setExpectedSum(null);
      setSumWarning(null);
    }
  }, [visible]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scannedUrl || isParsing) return;
    
    // Check if it's a tax.gov.ua URL
    if (data.includes('cabinet.tax.gov.ua/cashregs/check')) {
      const match = data.match(/[?&]sm=([\d\.]+)/);
      if (match) {
        setExpectedSum(parseFloat(match[1]));
      } else {
        setExpectedSum(null);
      }
      
      setScannedUrl(data);
      setIsParsing(true);
      setParsingStatus('Завантаження сторінки...');
      setSumWarning(null);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data && data.status) {
        setParsingStatus(data.status);
        return;
      }
      
      if (data && Array.isArray(data.items)) {
        if (data.expectedSum > 0 && Math.abs(data.parsedSum - data.expectedSum) > 0.05) {
            setSumWarning(data.expectedSum - data.parsedSum);
        } else {
            setSumWarning(null);
        }

        setParsedItems(prev => {
          // If we already have items (maybe restored from state), don't overwrite unless we want to
          // For now, if we parse a new receipt, we overwrite
          return data.items.map((item: any, index: number) => ({
            id: String(Date.now() + index),
            name: item.name || 'Товар',
            qty: parseFloat(item.qty) || 1,
            price: parseFloat(item.price) || 0,
            total: parseFloat(item.total) || 0
          }));
        });
        setIsParsing(false);
      }
    } catch (e) {
      console.error('Error parsing webview message', e);
      setIsParsing(false);
    }
  };

  const assignItemToUser = (user: User | 'TOTAL') => {
    if (!selectedItemToAssign) return;
    
    const debtItem: DebtItem = {
      id: String(Date.now()),
      text: selectedItemToAssign.name,
      num: selectedItemToAssign.total.toString()
    };

    if (user === 'TOTAL') {
      onAddTotalItem?.(debtItem);
    } else {
      onAddUserItem?.(user.id, debtItem);
    }

    // Remove item from parsed list
    setParsedItems(prev => prev.filter(i => i.id !== selectedItemToAssign.id));
    setSelectedItemToAssign(null);
  };

  const handleClear = () => {
    setParsedItems([]);
    setScannedUrl(null);
    setIsParsing(false);
    setParsingStatus('Завантаження сторінки...');
    setExpectedSum(null);
    setSumWarning(null);
  };

  // Поки чекаємо відповіді на запит дозволу — нічого не показуємо
  if (hasPermission === null) {
    return null;
  }

  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>Сканер чеків</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
              <MaterialIcons name="no-photography" size={48} color={colors.iconSecondary} />
              <Text style={{ color: colors.text, fontFamily: 'Montserrat', fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 24 }}>
                Щоб сканувати QR-коди чеків, дозвольте застосунку доступ до камери.
              </Text>
              <TouchableOpacity
                style={[styles.doneBtn, { backgroundColor: colors.buttonBg, alignSelf: 'stretch', alignItems: 'center' }]}
                onPress={() => (canAskAgain ? requestPermission() : Linking.openSettings())}
              >
                <Text style={[styles.doneBtnText, { color: colors.buttonText }]}>
                  {canAskAgain ? 'Дозволити доступ' : 'Відкрити налаштування'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  const jsToInject = `
    window.EXPECTED_SUM = ${expectedSum || 0};
    var retryCount = 0;
    
    var checkInterval = setInterval(function() {
      try {
        var text = document.body.innerText;
        if (text && (text.includes('ФІСКАЛЬНИЙ ЧЕК') || text.includes('Код УКТЗЕД') || text.includes('ТОВАРИСТВО') || text.includes('ФОП '))) {
           
           var lines = text.split('\\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });
           var items = [];
           var currentNameLines = [];
           
           for (var i = 0; i < lines.length; i++) {
               var line = lines[i];
               
               if (line.includes('---') || line.indexOf('Код УКТЗЕД') === 0 || line.indexOf('Штрих-код') === 0 || line.indexOf('Акцизна марка') === 0) {
                   continue;
               }
               
               var match = line.match(/^([\\d\\.,]+)\\s*[xх]\\s*([\\d\\.,]+)\\s*=\\s*([\\d\\.,]+)\\s*[А-ЯA-ZІЇЄ]*$/);
               if (match) {
                   var qty = parseFloat(match[1].replace(',', '.'));
                   var price = parseFloat(match[2].replace(',', '.'));
                   var total = parseFloat(match[3].replace(',', '.'));
                   
                   var name = currentNameLines.join(' ').trim();
                   name = name.replace(/.*онлайн[\\s\\d]*/gi, '');
                   name = name.replace(/.*ЧЕК ФН[\\s\\d]*/gi, '');
                   name = name.replace(/.*Касовий чек\\s*/gi, '');
                   name = name.replace(/АРТ\\.?№\\s*\\d+\\s*/gi, '');
                   name = name.trim();
                   
                   if (name && name.indexOf('ФІСКАЛЬНИЙ ЧЕК') === -1 && name.indexOf('ТОВАРИСТВО') === -1) {
                      items.push({ name: name, qty: qty, price: price, total: total });
                   }
                   currentNameLines = [];
               } else {
                   currentNameLines.push(line);
                   if (currentNameLines.length > 3) {
                       currentNameLines.shift();
                   }
               }
           }
           
           var parsedSum = items.reduce(function(acc, val) { return acc + val.total; }, 0);
           
           if (window.EXPECTED_SUM > 0 && Math.abs(parsedSum - window.EXPECTED_SUM) > 0.05) {
               if (retryCount < 2) {
                   retryCount++;
                   return; // Wait for the next interval
               }
           }
           
           clearInterval(checkInterval);
           window.ReactNativeWebView.postMessage(JSON.stringify({ 
               items: items, 
               expectedSum: window.EXPECTED_SUM, 
               parsedSum: parsedSum 
           }));
        } else {
           var btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.includes('Пошук'));
           if (btn && !btn.disabled && !window.searchClicked) {
               window.searchClicked = true;
               btn.click();
           }
        }
      } catch(e) {
      }
    }, 1000);
    true;
  `;

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background, height: WINDOW_HEIGHT * 0.85 }]}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Сканер чеків</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {isParsing && scannedUrl ? (
            <View style={{ flex: 1, backgroundColor: colors.background }}>
              <View style={{ padding: 12, backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' }}>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Montserrat', fontSize: 14 }}>Пройдіть капчу та натисніть "Пошук"</Text>
              </View>
              <WebView
                source={{ uri: scannedUrl }}
                injectedJavaScript={jsToInject}
                onMessage={handleWebViewMessage}
                javaScriptEnabled={true}
                showsVerticalScrollIndicator={false}
              />
            </View>
          ) : !scannedUrl && parsedItems.length === 0 ? (
            <View style={styles.cameraContainer}>
              <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={handleBarCodeScanned}
              >
                <View style={styles.cameraOverlay}>
                  <View style={styles.scanBox} />
                  <Text style={styles.scanText}>Наведіть на QR-код фіскального чека</Text>
                </View>
              </CameraView>
            </View>
          ) : (
            <View style={styles.splitContainer}>
              <View style={styles.splitHeader}>
                <Text style={[styles.splitTitle, { color: colors.text }]}>Позиції чека</Text>
                <TouchableOpacity onPress={handleClear} style={[styles.clearBtn, { backgroundColor: colors.negativeBg }]}>
                  <Text style={[styles.clearBtnText, { color: colors.negativeText }]}>Очистити</Text>
                </TouchableOpacity>
              </View>

              {sumWarning !== null && Math.abs(sumWarning) > 0.05 && (
                <View style={{ backgroundColor: colors.warningBg || '#FFF3CD', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: colors.warningBorder || '#FFEEBA' }}>
                  <Text style={{ color: colors.warningText || '#856404', fontFamily: 'MontserratBold', fontSize: 13, textAlign: 'center' }}>
                    Увага: Контрольна сума не зійшлась на {Math.abs(sumWarning).toFixed(2)} {currencySymbol}.
                  </Text>
                  <Text style={{ color: colors.warningText || '#856404', fontFamily: 'Montserrat', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                    Перевірте список, можливо деякі товари не розпізнались.
                  </Text>
                </View>
              )}

              {parsedItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="receipt" size={64} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Всі позиції розподілено!</Text>
                  <TouchableOpacity 
                    style={[styles.doneBtn, { backgroundColor: colors.buttonBg }]} 
                    onPress={onClose}
                  >
                    <Text style={[styles.doneBtnText, { color: colors.buttonText }]}>Готово</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.itemsList}>
                  {parsedItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.itemCard, 
                        { backgroundColor: colors.card, borderColor: colors.border },
                        selectedItemToAssign?.id === item.id && { borderColor: colors.buttonBg, borderWidth: 2 }
                      ]}
                      onPress={() => setSelectedItemToAssign(item)}
                    >
                      <View style={styles.itemInfo}>
                        <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                        <Text style={[styles.itemQty, { color: colors.textSecondary }]}>{item.qty} шт × {item.price} {currencySymbol}</Text>
                      </View>
                      <Text style={[styles.itemTotal, { color: colors.text }]}>{item.total} {currencySymbol}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          {/* User Selection Overlay */}
          {selectedItemToAssign && (
            <View style={styles.userSelectionOverlay}>
              <View style={[styles.userSelectionBox, { backgroundColor: colors.card }]}>
                <Text style={[styles.userSelectionTitle, { color: colors.text }]}>Кому призначити?</Text>
                <Text style={[styles.userSelectionItem, { color: colors.text }]} numberOfLines={2}>
                  {selectedItemToAssign.name} ({selectedItemToAssign.total} {currencySymbol})
                </Text>
                
                <ScrollView style={styles.userList} showsVerticalScrollIndicator={false}>
                  <TouchableOpacity
                    style={[styles.userRow, { borderBottomColor: colors.border }]}
                    onPress={() => assignItemToUser('TOTAL')}
                  >
                    <MaterialIcons name="group" size={24} color={colors.text} style={{ marginRight: 12 }} />
                    <Text style={[styles.userName, { color: colors.text }]}>Спільне (на всіх)</Text>
                  </TouchableOpacity>
                  
                  {users.map(u => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.userRow, { borderBottomColor: colors.border }]}
                      onPress={() => assignItemToUser(u)}
                    >
                      <MaterialIcons name="person" size={24} color={colors.textSecondary} style={{ marginRight: 12 }} />
                      <Text style={[styles.userName, { color: colors.text }]}>{u.name} {u.secondName}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity 
                  style={[styles.cancelBtn, { borderColor: colors.border }]} 
                  onPress={() => setSelectedItemToAssign(null)}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Скасувати</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'MontserratBold',
  },
  closeBtn: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    fontFamily: 'Montserrat',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Montserrat',
  },
  splitContainer: {
    flex: 1,
    padding: 16,
  },
  splitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  splitTitle: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  clearBtnText: {
    fontSize: 12,
    fontFamily: 'MontserratBold',
  },
  itemsList: {
    flex: 1,
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'Montserrat',
    marginBottom: 4,
  },
  itemQty: {
    fontSize: 13,
    fontFamily: 'Montserrat',
  },
  itemTotal: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontFamily: 'Montserrat',
    marginTop: 16,
    marginBottom: 24,
  },
  doneBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  doneBtnText: {
    fontSize: 16,
    fontFamily: 'MontserratBold',
  },
  userSelectionOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 100,
  },
  userSelectionBox: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
  },
  userSelectionTitle: {
    fontSize: 18,
    fontFamily: 'MontserratBold',
    marginBottom: 8,
  },
  userSelectionItem: {
    fontSize: 14,
    fontFamily: 'Montserrat',
    marginBottom: 16,
  },
  userList: {
    flexGrow: 0,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Montserrat',
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
  },
  cancelBtnText: {
    fontSize: 16,
    fontFamily: 'Montserrat',
  }
});

export default QRScannerModal;
