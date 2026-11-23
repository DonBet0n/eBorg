import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Dimensions, Linking, ActivityIndicator, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import ReceiptCamera from './ReceiptCamera';
import { WebView } from 'react-native-webview';
import Icon from '@/components/ui/Icon';
import Avatar from '@/components/ui/Avatar';
import { formatAmount } from '../utils/debtCalculations';
import { User, DebtItem } from '../types/debt';
import { useAppTheme } from '../contexts/ThemeContext';
import { appStyles } from '@/utils/appStyles';
import { BUTTON } from '@/constants/Theme';

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
const LOADING_STATUS = 'Завантаження сторінки...';
const CAPTCHA_STATUS = 'Пройдіть капчу та натисніть "Пошук"';

const QRScannerModal: React.FC<QRScannerModalProps> = ({ visible, onClose, users, onAddUserItem, onAddTotalItem }) => {
  const { colors, isDark, currencySymbol } = useAppTheme();
  const surface = isDark ? colors.card : colors.cardAlt;
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [scannedUrl, setScannedUrl] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState(LOADING_STATUS);
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

  // Спершу лише перевіряємо дозвіл, а системний запит робимо тільки коли його ще немає.
  // Запит при вже виданому дозволі на цій збірці (нова архітектура RN) може так і не повернути відповідь,
  // і сканер висів на спінері
  const checkPermission = async () => {
    const { status, canAskAgain: canAsk } = await Camera.getCameraPermissionsAsync();
    if (status === 'granted') {
      setHasPermission(true);
      return;
    }
    if (canAsk) {
      await requestPermission();
    } else {
      setHasPermission(false);
      setCanAskAgain(false);
    }
  };

  useEffect(() => {
    if (visible) {
      checkPermission();
    } else {
      // Reset state on close
      setScannedUrl(null);
      setIsParsing(false);
      setParsingStatus(LOADING_STATUS);
      setParsedItems([]);
      setSelectedItemToAssign(null);
      setExpectedSum(null);
      setSumWarning(null);
    }
    // Перевірка дозволу — лише при відкритті; checkPermission змінює тільки локальний стан
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Камера сама перевіряє, що це QR-код податкової, і віддає лише посилання на чек
  const handleReceipt = (data: string) => {
    if (scannedUrl || isParsing) return;
    const match = data.match(/[?&]sm=([\d\.]+)/);
    setExpectedSum(match ? parseFloat(match[1]) : null);
    setScannedUrl(data);
    setIsParsing(true);
    setParsingStatus(LOADING_STATUS);
    setSumWarning(null);
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
    setParsingStatus(LOADING_STATUS);
    setExpectedSum(null);
    setSumWarning(null);
  };

  // Системна «Назад» повертає на крок назад, а не закриває все одразу
  const handleBack = () => {
    if (selectedItemToAssign) setSelectedItemToAssign(null);
    else if (isParsing) handleClear();
    else onClose();
  };

  // Шапка як у шторок застосунку: заголовок і кругла кнопка закриття
  const renderHeader = (onPress: () => void) => (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>Сканер чеків</Text>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.closeButton, { backgroundColor: colors.cardAlt }]}
        accessibilityRole="button"
        accessibilityLabel="Закрити"
      >
        <Icon name="close" size={24} color={colors.icon} />
      </TouchableOpacity>
    </View>
  );

  // Поки чекаємо відповіді на запит дозволу — чорний екран камери з індикатором, без блимання
  if (hasPermission === null) {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent={true} onRequestClose={onClose}>
        <View style={styles.permissionLoading}>
          <ActivityIndicator color="#fff" />
        </View>
      </Modal>
    );
  }

  if (!hasPermission) {
    return (
      <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true} onRequestClose={onClose}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: colors.background }]}>
            {renderHeader(onClose)}
            <View style={styles.permission}>
              <View style={[styles.iconCircle, { backgroundColor: surface }]}>
                <Icon name="no-photography" size={32} color={colors.iconSecondary} />
              </View>
              <Text style={[styles.permissionText, { color: colors.text }]}>
                Щоб сканувати QR-коди чеків, дозвольте застосунку доступ до камери.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.buttonBg }]}
                onPress={() => (canAskAgain ? requestPermission() : Linking.openSettings())}
                accessibilityRole="button"
              >
                <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>
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

  const isCamera = !scannedUrl && parsedItems.length === 0;

  if (isCamera) {
    return (
      <Modal visible={visible} animationType="fade" statusBarTranslucent={true} onRequestClose={onClose}>
        <ReceiptCamera onClose={onClose} onReceipt={handleReceipt} />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent={true} onRequestClose={handleBack}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, styles.sheetTall, { backgroundColor: colors.background }]}>
          {renderHeader(onClose)}

          {isParsing && scannedUrl ? (
            <View style={styles.flex}>
              {/* Сторінка податкової: застосунок сам натискає «Пошук», а капчу проходить людина */}
              <View style={[styles.status, { backgroundColor: surface }]}>
                {parsingStatus === LOADING_STATUS && <ActivityIndicator size="small" color={colors.textSecondary} />}
                <Text style={[styles.statusText, { color: colors.textSecondary }]}>{parsingStatus}</Text>
              </View>
              <View style={[styles.webFrame, { borderColor: colors.border }]}>
                <WebView
                  source={{ uri: scannedUrl }}
                  injectedJavaScript={jsToInject}
                  onMessage={handleWebViewMessage}
                  onLoadStart={() => setParsingStatus(LOADING_STATUS)}
                  onLoadEnd={() => setParsingStatus(CAPTCHA_STATUS)}
                  javaScriptEnabled={true}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            </View>
          ) : (
            <View style={styles.flex}>
              <View style={styles.listHeader}>
                <Text style={[styles.listTitle, { color: colors.text }]}>
                  Позиції чека{parsedItems.length > 0 ? ` · ${parsedItems.length}` : ''}
                </Text>
                <TouchableOpacity
                  onPress={handleClear}
                  style={[styles.smallButton, { backgroundColor: colors.negativeBg }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.smallButtonText, { color: colors.negativeText }]}>Очистити</Text>
                </TouchableOpacity>
              </View>

              {sumWarning !== null && Math.abs(sumWarning) > 0.05 && (
                <View style={[styles.warning, { backgroundColor: colors.warningBg, borderColor: colors.warningBorder }]}>
                  <Icon name="alert" size={20} color={colors.warningText} />
                  <View style={styles.flex}>
                    <Text style={[styles.warningTitle, { color: colors.warningText }]}>
                      Сума не зійшлася на {formatAmount(Math.abs(sumWarning))} {currencySymbol}
                    </Text>
                    <Text style={[styles.warningText, { color: colors.warningText }]}>
                      Перевірте список: деякі товари могли не розпізнатися.
                    </Text>
                  </View>
                </View>
              )}

              {parsedItems.length === 0 ? (
                <View style={styles.empty}>
                  <View style={[styles.iconCircle, { backgroundColor: surface }]}>
                    <Icon name="success" size={32} color={colors.positiveText} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Усі позиції розподілено</Text>
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.emptyButton, { backgroundColor: colors.buttonBg }]}
                    onPress={onClose}
                    accessibilityRole="button"
                  >
                    <Text style={[styles.primaryButtonText, { color: colors.buttonText }]}>Готово</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Натисніть на позицію, щоб додати її комусь або в спільні витрати.
                  </Text>
                  <ScrollView style={styles.flex} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                    {parsedItems.map(item => (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          styles.itemCard,
                          { backgroundColor: surface, borderColor: selectedItemToAssign?.id === item.id ? colors.text : 'transparent' },
                        ]}
                        onPress={() => setSelectedItemToAssign(item)}
                        accessibilityRole="button"
                      >
                        <View style={styles.flex}>
                          <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                          <Text style={[styles.itemQty, { color: colors.textSecondary }]}>
                            {item.qty} × {formatAmount(item.price)} {currencySymbol}
                          </Text>
                        </View>
                        <Text style={[styles.itemTotal, { color: colors.text }]}>{formatAmount(item.total)} {currencySymbol}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}
            </View>
          )}

        </View>

        {/* Поверх усього екрана, а не лише шторки — щоб картка стояла рівно по центру */}
        {selectedItemToAssign && (
          <View style={styles.assignOverlay}>
            <View style={[styles.assignCard, { backgroundColor: isDark ? colors.card : colors.background }]}>
              <Text style={[styles.assignTitle, { color: colors.text }]}>Кому додати?</Text>
              <Text style={[styles.assignItem, { color: colors.textSecondary }]} numberOfLines={2}>
                {selectedItemToAssign.name} · {formatAmount(selectedItemToAssign.total)} {currencySymbol}
              </Text>

              <ScrollView style={styles.assignList} showsVerticalScrollIndicator={false}>
                <TouchableOpacity style={styles.assignRow} onPress={() => assignItemToUser('TOTAL')} accessibilityRole="button">
                  <View style={[styles.groupIcon, { backgroundColor: colors.border }]}>
                    <Icon name="group" size={20} color={colors.textSecondary} />
                  </View>
                  <Text style={[styles.assignName, { color: colors.text }]}>Спільні витрати</Text>
                </TouchableOpacity>
                {users.map(u => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.assignRow, styles.assignDivider, { borderTopColor: colors.border }]}
                    onPress={() => assignItemToUser(u)}
                    accessibilityRole="button"
                  >
                    <Avatar uri={u.avatar} name={u.name} size={40} />
                    <Text style={[styles.assignName, { color: colors.text }]} numberOfLines={1}>
                      {`${u.name || ''} ${u.secondName || ''}`.trim()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.primaryButton, styles.assignCancel, { backgroundColor: colors.cardAlt }]}
                onPress={() => setSelectedItemToAssign(null)}
                accessibilityRole="button"
              >
                <Text style={[styles.primaryButtonText, { color: colors.text }]}>Скасувати</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = appStyles({
  flex: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  sheetTall: {
    height: WINDOW_HEIGHT * 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionLoading: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permission: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  primaryButton: {
    alignSelf: 'stretch',
    minHeight: BUTTON.height,
    paddingHorizontal: 24,
    borderRadius: BUTTON.radius,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  webFrame: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listTitle: {
    fontSize: 18,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  smallButton: {
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: 999,
    justifyContent: 'center',
  },
  smallButtonText: {
    fontSize: 13,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginBottom: 12,
  },
  warning: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  warningTitle: {
    fontSize: 14,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  warningText: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 8,
  },
  // Рамка є завжди (прозора), щоб виділення не зсувало вміст картки
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
  },
  itemQty: {
    fontSize: 13,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  itemTotal: {
    fontSize: 16,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    alignSelf: 'center',
    minWidth: 200,
  },
  assignOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  assignCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  assignTitle: {
    fontSize: 20,
    fontFamily: 'NunitoSansExtraBold',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  assignItem: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'NunitoSans',
    letterSpacing: 0.3,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  assignList: {
    flexGrow: 0,
  },
  assignRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  assignDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignName: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'NunitoSansBold',
    letterSpacing: 0.3,
  },
  assignCancel: {
    marginTop: 12,
  },
});

export default QRScannerModal;
