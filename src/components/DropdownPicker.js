import React from 'react';
import styled from 'styled-components/native';
import { Dropdown } from 'react-native-element-dropdown';
import { Text } from 'react-native';
import {colors} from '../Styles/appStyle';

const FieldContainer = styled.View`
  margin-bottom: 10px;
  margin-top: 5px;
`;

const Label = styled.Text`
  font-size: 15px;
  margin-bottom: 5px;
  fontWeight: 600,
`;

const PickerContainer = styled.View`
  border-width: 1px;
  color: black;
  border-color: #ccc;
  border-radius: 5px;
`;

const DropdownPicker = ({ error, label, placeHolder, data, value, setValue, enableDynamicActionStyle = false, style = {}, disabled = false }) => {
  // Optional dynamic style logic
  const getSelectedStyle = () => {
    if (!enableDynamicActionStyle) return {};
    switch (value) {
      case 'APPROVE':
        return {
          borderColor: '#2e7d32',
          backgroundColor: '#e8f5e9',
        };
      case 'REJECT':
      case 'Back To Claimant':
        return {
          borderColor: '#c62828',
          backgroundColor: '#ffebee',
        };
      case 'FORWARD':
        return {
          borderColor: '#1565c0',
          backgroundColor: '#e3f2fd',
        };
      default:
        return {
          borderColor: '#ccc',
          backgroundColor: '#fff',
        };
    }
  };

  const dynamicStyle = getSelectedStyle();

  return (
    <FieldContainer style={style}>
      <Label>{label}</Label>
      <PickerContainer style={{ ...dynamicStyle, borderWidth: 1, borderRadius: 8, opacity: disabled ? 0.6 : 1 }}>
        <Dropdown
          data={(data || []).map((item) => ({
            label: item.label,
            value: item.value,
          }))}
          labelField="label"
          valueField="value"
          mode="modal"
          placeholder={`Select ${placeHolder? placeHolder : label}`}
          value={value}
          onChange={(item) => setValue(item.value)}
          style={{
            padding: 10,
            ...dynamicStyle,
            borderRadius: 8,
            backgroundColor: disabled ? '#f5f5f5' : dynamicStyle.backgroundColor || '#fff',
          }}
          placeholderStyle={{
            color: '#ccc',
            fontSize: 16,
          }}
          selectedTextStyle={{
            fontSize: 16,
            color: disabled ? '#888' : '#222',
          }}
          disable={disabled}
        />
      </PickerContainer>
      {error && (
        <Text style={{ marginTop: 7, color: '#ff3b30', fontSize: 12 }}>
          {error}
        </Text>
      )}
    </FieldContainer>
  );
};

export default DropdownPicker;
