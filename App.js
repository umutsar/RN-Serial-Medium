
import { UsbSerialManager } from 'react-native-usb-serialport-for-android';
import { useEffect } from "react";
import { useState } from "react";
import { Alert, Button, PermissionsAndroid, ScrollView, StyleSheet, Text, View } from "react-native";

const App = () => {
    // Alınan veriyi gerçek zamanlı güncellemek ve kullanmak için useState hook'u kullandık
    const [receivedData, setReceivedData] = useState();
    const [usbSerialPort, setUsbSerialPort] = useState(null);

    // 1 saniye aralıklarla tarama yap
    function startUSBMonitoring() {
        const intervalId = setInterval(async () => {
            try {
                const devices = await UsbSerialManager.list();
                if (devices.length > 0) {
                    clearInterval(intervalId); // Cihaz bulundu, taramayı durdur
                    await requestUSBPermission(devices[0]);
                } else {
                    console.log('No USB devices found, retrying...');
                }
            } catch (err) {
                console.error('Error scanning for devices:', err);
            }
        }, 1000); // 1 saniye aralığı ile tara
    }

    // USB erişimi için external storage izni al
    async function requestUSBPermission() {
        try {
            const grantedStorage = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                {
                    title: "External Storage Permission",
                    message: "This app needs access to external storage",
                    buttonNeutral: "Ask Me Later",
                    buttonNegative: "Cancel",
                    buttonPositive: "OK"
                }
            );

            if (grantedStorage !== PermissionsAndroid.RESULTS.GRANTED) {
                Alert.alert('Storage permission denied');
                return;
            }
            
            const devices = await UsbSerialManager.list();
            if (devices.length > 0) {
                const grantedUSB = await UsbSerialManager.tryRequestPermission(devices[0].deviceId);

                if (grantedUSB) {
                    Alert.alert('USB permission granted');

                    // Kullandığınız uart opsiyonları;
                    const port = await UsbSerialManager.open(devices[0].deviceId, {
                        baudRate: 9600,
                        parity: 0,
                        dataBits: 8,
                        stopBits: 1,
                    });
                    setUsbSerialPort(port);
                } else {
                    Alert.alert('USB permission denied');
                }
            } else {
                Alert.alert('No USB devices found');
            }
        } catch (err) {
            console.error('Error requesting permission:', err);
            Alert.alert('Error', 'Permission request failed');
        }
    }

    useEffect(() => {
        let subscription;

        if (usbSerialPort) {
            subscription = usbSerialPort.onReceived((event) => {

                // Gelen string türünde veriyi event.data ile al
                const data = event.data;
                // Verilerin karışmaması için gönderici tarafında her byte arasına 255 koymalıyız
                const modifiedData = data.split("FF").filter(part => part.length > 0).map(part => parseInt(part, 16));

                let dataDecimalArray = [];

                for (let i = 0; i < modifiedData.length; i++) {
                    const byte = modifiedData[i];
                    dataDecimalArray.push(byte);
                }

                setReceivedData(modifiedData.join(","));
            });

            // Bağlantı koptuğunda "tekrar" taramayı başlat
            return () => {
                if (subscription) {
                    subscription.remove();
                }
                if (usbSerialPort) {
                    usbSerialPort.close(); // Portu kapat
                    setUsbSerialPort(null); // Portu null yap
                    startUSBMonitoring(); // Tekrar tarama başlat
                }
            };
        } else {
            startUSBMonitoring(); // Eğer port bağlı değilse taramayı başlat
        }

    }, [usbSerialPort]);
    
    // Ekranda görünecek komponentler
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Button onPress={requestUSBPermission} title="Bağlan" color="#007BFF" />
            </View>

            <View style={styles.dataContainer}>
                <Text style={styles.title}>Alınan Veri</Text>
                <Text style={styles.data}>{receivedData}</Text>
            </View>

        </ScrollView>
    );

}

// Temel stil kodları
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
        marginTop: 16
    },
    header: {
        marginBottom: 20,
    },
    dataContainer: {
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    data: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
});

export default App;