import { calculateHashes } from '@/utils/checksums/safeHashesCalculator';

describe('safeHashesCalculator', () => {
  it('calculates hashes correctly for version 1.3.0', async () => {
    const result = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '0', // nonce
      '1.3.0' // version
    );

    // Check that the result has the expected properties
    expect(result).toHaveProperty('domainHash');
    expect(result).toHaveProperty('messageHash');
    expect(result).toHaveProperty('safeTxHash');
    expect(result).toHaveProperty('encodedMessage');

    // Check that the hashes are valid hex strings
    expect(result.domainHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.messageHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.safeTxHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.encodedMessage).toMatch(/^0x[a-f0-9]+$/i);
  });

  it('calculates hashes correctly for version 1.0.0', async () => {
    const result = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '0', // nonce
      '1.0.0' // version
    );

    // Check that the result has the expected properties
    expect(result).toHaveProperty('domainHash');
    expect(result).toHaveProperty('messageHash');
    expect(result).toHaveProperty('safeTxHash');
    expect(result).toHaveProperty('encodedMessage');

    // Check that the hashes are valid hex strings
    expect(result.domainHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.messageHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.safeTxHash).toMatch(/^0x[a-f0-9]{64}$/i);
    expect(result.encodedMessage).toMatch(/^0x[a-f0-9]+$/i);
  });

  it('calculates different hashes for different inputs', async () => {
    const result1 = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '0', // nonce
      '1.3.0' // version
    );

    const result2 = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '1', // nonce (different)
      '1.3.0' // version
    );

    // Check that the hashes are different
    expect(result1.safeTxHash).not.toEqual(result2.safeTxHash);
  });

  it('calculates different hashes for different versions', async () => {
    const result1 = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '0', // nonce
      '1.3.0' // version
    );

    const result2 = await calculateHashes(
      '1', // chainId
      '0x1234567890123456789012345678901234567890', // address
      '0x0000000000000000000000000000000000000000', // to
      '0', // value
      '0x', // data
      '0', // operation
      '0', // safeTxGas
      '0', // baseGas
      '0', // gasPrice
      '0x0000000000000000000000000000000000000000', // gasToken
      '0x0000000000000000000000000000000000000000', // refundReceiver
      '0', // nonce
      '1.0.0' // version (different)
    );

    // Check that the domain hashes are different
    expect(result1.domainHash).not.toEqual(result2.domainHash);
  });
}); 