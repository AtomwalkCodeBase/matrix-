import React from 'react';
import { Text } from 'react-native';
import styled from 'styled-components/native';
import {colors} from '../Styles/appStyle';

const FieldContainer = styled.View`
  margin-bottom: 10px;
  margin-top: 5px;
`;
const Input = styled.TextInput`
  border: 1px solid #ccc;
  padding: 10px;
  border-radius: 8px;
  font-size: 16px;
`;

const Label = styled.Text`
  font-size: 16px;
  margin-top: 15px;
  margin-bottom: 5px;
  font-weight: 600;
`;

const AmountInput = ({ error, label,placeholder ,claimAmount, setClaimAmount }) => {
  return (
    <FieldContainer>
     {label && <Label>{label}</Label>}
      <Input
        placeholder={placeholder || "Claim Amount"}
        keyboardType="numeric"
        value={claimAmount}
        onChangeText={setClaimAmount}
      />
      {error && (
        <Text style={{marginTop: 7, color: colors.red, fontSize: 12}}>
          {error}
        </Text>
      )}
    </FieldContainer>
  );
};

export default AmountInput;
