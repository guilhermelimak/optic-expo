import { NativeStackScreenProps } from 'react-native-screens/native-stack'
import React from 'react'
import { fireEvent, waitFor } from '@testing-library/react-native'
import { Alert } from 'react-native'

import { getMockedNavigation, renderWithTheme } from '../../test/utils'
import { MainStackParamList } from '../Main'
import { Secret } from '../types'
import { useSecrets } from '../context/SecretsContext'
import apiFactory from '../lib/api'

import { TokenScreen } from './TokenScreen'

const secret: Secret = {
  _id: 'id',
  secret: 'secret',
  uid: 'uid',
  tokens: [
    {
      description: 'A description',
      token: 'a-token',
    },
  ],
  account: 'account',
  issuer: '',
}

jest.mock('../lib/api')
jest.mock('../hooks/use-push-token', () => () => 'dummy-expo-token')
jest.mock('../context/SecretsContext')

// Continue after alert by clicking the confirm button
jest
  .spyOn(Alert, 'alert')
  .mockImplementation((title, message, callbackOrButtons) =>
    callbackOrButtons[1].onPress()
  )

describe('TokenScreen', () => {
  const updateSecretStub = jest.fn()
  const apiGenerateTokenStub = jest.fn()
  const apiRevokeTokenStub = jest.fn()
  const registerSubscriptionStub = jest.fn().mockResolvedValue('a-sub')

  beforeEach(() => {
    ;(useSecrets as jest.Mock).mockReturnValue({
      secrets: [secret],
      add: jest.fn(),
      update: updateSecretStub,
      remove: jest.fn(),
      replace: jest.fn(),
    })
    ;(apiFactory as jest.Mock).mockReturnValue({
      generateToken: apiGenerateTokenStub,
      revokeToken: apiRevokeTokenStub,
      registerSubscription: registerSubscriptionStub,
    })
  })

  const setup = () => {
    const props = {
      navigation: getMockedNavigation<'Token'>(),
      route: {
        params: { secretId: secret._id, token: secret.tokens[0].token },
      },
    } as unknown as NativeStackScreenProps<MainStackParamList, 'Token'>

    return renderWithTheme(<TokenScreen {...props} />)
  }

  it('refreshes token', async () => {
    const { getByText } = setup()
    await waitFor(() => {
      expect(registerSubscriptionStub).toBeCalled()
    })
    fireEvent.press(getByText('REFRESH TOKEN'))
    expect(apiGenerateTokenStub).toBeCalledTimes(1)
  })

  it('revokes token', async () => {
    const { getByText } = setup()
    await waitFor(() => {
      expect(registerSubscriptionStub).toBeCalled()
    })
    fireEvent.press(getByText('REVOKE TOKEN'))
    expect(apiRevokeTokenStub).toBeCalledTimes(1)
  })

  it('saves description in the background', async () => {
    // Using fake timer as description saving is debounced
    jest.useFakeTimers()
    updateSecretStub.mockReset()
    const { getByLabelText } = setup()

    await waitFor(() => {
      expect(registerSubscriptionStub).toBeCalled()
    })

    const inputtedDescriptionText = 'An updated description'

    const descriptionInput = getByLabelText('Description')
    fireEvent.changeText(descriptionInput, inputtedDescriptionText)
    jest.runOnlyPendingTimers()

    expect(updateSecretStub).toBeCalledTimes(1)
    expect(updateSecretStub).toBeCalledWith({
      ...secret,
      tokens: [{ ...secret.tokens[0], description: inputtedDescriptionText }],
    })
  })

  it("doesn't save description if it's empty", () => {
    // Using fake timer as description saving is debounced
    jest.useFakeTimers()
    registerSubscriptionStub.mockReset()
    updateSecretStub.mockReset()
    const { getByLabelText } = setup()

    const descriptionInput = getByLabelText('Description')
    fireEvent.changeText(descriptionInput, '')

    jest.runOnlyPendingTimers()

    expect(updateSecretStub).toBeCalledTimes(0)
  })
})
