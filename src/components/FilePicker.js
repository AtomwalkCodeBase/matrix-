import React, { useState } from "react";
import { TouchableOpacity, Text, Image, ActivityIndicator, Modal, View, StyleSheet, Animated, Alert } from "react-native";
import styled from "styled-components/native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system";
import { colors } from "../Styles/appStyle";
import { MaterialIcons } from "@expo/vector-icons";


const FileButton = styled.TouchableOpacity`
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 8px;
  margin-top: 8px;
`;

const Label = styled.Text`
  font-size: 16px;
  margin-top: 15px;
  margin-bottom: 5px;
`;

const InputText = styled.Text`
  color: black;
  font-size: 16px;
  font-weight: normal;
  flex: 1;
  flex-shrink: 1;
  margin-right: 10px;
  max-width: 80%;
`;

const Icon = styled.Image`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_MIME_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/json",
  "application/zip",
  "*/*"
];

const filenameFromUri = (uri = "") =>
  uri.split("/").pop()?.split("?")[0] || "file";

const inferMime = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    bmp: "image/bmp",
    webp: "image/webp",
    heic: "image/heic",

    pdf: "application/pdf",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    csv: "text/csv",
    txt: "text/plain",
    zip: "application/zip",
    json: "application/json"
  };

  return map[ext] || "application/octet-stream";
};

const getFileSize = async (uri) => {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    return info.size || 0;
  } catch {
    return 0;
  }
};

const getMimeFromFilename = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "pdf":
      return "application/pdf";
    case "heic":
      return "image/heic";
    default:
      return "application/octet-stream";
  }
};


const FilePicker = ({ label, fileName, fileUri, setFileName, setFileUri, setFileMimeType, error, existingImgUri= null}) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [scaleValue] = useState(new Animated.Value(0));

    const openModal = () => {
    setShowModal(true);
    Animated.spring(scaleValue, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start();
  };

  const closeModal = () => {
    Animated.spring(scaleValue, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 8,
    }).start(() => {
      setShowModal(false);
    });
  };

  const handleFilePick = async () => {
    openModal();
  };

 const handleCameraCapture = async () => {
    closeModal();
    setLoading(true);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Required", "Camera permission is required to take photos.");
        setLoading(false);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      const cancelled = result?.canceled ?? result?.cancelled ?? false;
      if (cancelled) {
        setLoading(false);
        return;
      }

      const uri = result.uri ?? result.assets?.[0]?.uri;
      if (!uri) {
        Alert.alert("Error", "Could not read captured image.");
        setLoading(false);
        return;
      }

      // size limit
      const fileSize = await getFileSize(uri);
      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert("File Too Large", "Maximum allowed size is 5 MB.");
        setLoading(false);
        return;
      }

      const compressed = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG
      });

      const filename = filenameFromUri(uri);
      const mime = inferMime(filename);

      setFileName(filename);
      setFileUri(compressed.uri);
      setFileMimeType(mime);
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Unable to capture image.");
    }

    setLoading(false);
  };


 const handleFileSelect = async () => {
    closeModal();
    setLoading(true);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ALLOWED_MIME_TYPES,
        copyToCacheDirectory: true
      });

      if (result.type === "cancel") {
        setLoading(false);
        return;
      }

      const uri = result.uri ?? result.assets?.[0]?.uri;
      const filename = result.name ?? filenameFromUri(uri);
      const mime = result.mimeType ?? inferMime(filename);

      if (!uri) {
        Alert.alert("Error", "Unable to read selected file.");
        setLoading(false);
        return;
      }

      // ❌ Reject videos
      if (mime.startsWith("video/")) {
        Alert.alert("Invalid File", "Videos are not allowed.");
        setLoading(false);
        return;
      }

      // size validation
      const fileSize = await getFileSize(uri);
      if (fileSize > MAX_FILE_SIZE) {
        Alert.alert("File Too Large", "Maximum allowed size is 5 MB.");
        setLoading(false);
        return;
      }

      let finalUri = uri;

      // compress images only
      if (mime.startsWith("image/")) {
        try {
          const compressed = await ImageManipulator.manipulateAsync(uri, [], {
            compress: 0.9,
            format: ImageManipulator.SaveFormat.JPEG
          });
          finalUri = compressed.uri;
        } catch {
          console.warn("Compression failed.");
        }
      }

      setFileName(filename);
      setFileUri(finalUri);
      setFileMimeType(mime);
    } catch (error) {
      console.error("File Picker Error:", error);
      Alert.alert("Error", "Unable to pick file.");
    }

    setLoading(false);
  };


  const clearData = () => {
    setFileName("");
    setFileUri("");
    setFileMimeType("");
  };

  return (
    <>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Label>{label}</Label>
       {fileName && <TouchableOpacity onPress={clearData}>
          <Text
            style={{
              color: colors.primary,
              fontSize: 16,
              fontWeight: 600,
              marginTop: 12,
            }}
          >
            Clear
          </Text>
        </TouchableOpacity>}
      </View>

      <FileButton onPress={handleFilePick}>
        <InputText numberOfLines={1} ellipsizeMode="middle">{fileName || "No file selected"}</InputText>
        <Icon source={require("../../assets/images/Upload-Icon.png")} />
      </FileButton>

      {loading && (
        <View style={{ marginTop: 16, alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {error && (
        <Text style={{ marginTop: 7, color: colors.red, fontSize: 12 }}>
          {error}
        </Text>
      )}

     {fileUri && (
        inferMime(fileName).startsWith("image/") ? (
          <Image
            source={{ uri: fileUri }}
            style={{
              width: 250,
              height: 140,
              borderRadius: 12,
              resizeMode: "contain",
              marginTop: 10,
              alignSelf: "center"
            }}
          />
        ) : (
          <Text
            style={{
              textAlign: "center",
              marginTop: 10,
              fontSize: 15,
              color: "#333"
            }}
          >
            📄 {fileName}
          </Text>
        )
      )}
      
      <Modal visible={showModal} transparent animationType="none">
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            onPress={closeModal}
            activeOpacity={1}
          />
          <Animated.View 
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleValue }]
              }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Option</Text>
              <Text style={styles.modalSubtitle}>
                Choose a file from the library or capture a photo
              </Text>
            </View>

            <View style={styles.optionContainer}>
              <TouchableOpacity 
                style={styles.optionButton}
                onPress={handleCameraCapture}
              >
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="camera-alt" size={24} color={colors.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Capture Photo</Text>
                  <Text style={styles.optionSubtitle}>Take a new photo</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.optionButton}
                onPress={handleFileSelect}
              >
                <View style={styles.optionIconContainer}>
                  <MaterialIcons name="folder" size={24} color={colors.primary} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Choose File</Text>
                  <Text style={styles.optionSubtitle}>Select from library</Text>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#ccc" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={closeModal}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f0ebff",
  },
  clearText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  errorText: {
    marginTop: 7,
    color: "#f44336",
    fontSize: 12,
  },
  imageContainer: {
    alignItems: "center",
    marginTop: 12,
  },
  previewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    resizeMode: "cover",
    borderWidth: 2,
    borderColor: colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 24,
    margin: 20,
    maxWidth: 320,
    width: "90%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  optionContainer: {
    marginBottom: 20,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#f8f6ff",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e8e0ff",
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0ebff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
});

export default FilePicker;
