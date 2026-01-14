import { init, tx, id } from '@instantdb/react';

const APP_ID = 'be60ebd7-9f97-4338-97a0-b6f49cf47bab';

type Schema = {
  pools: {
    id: string;
    poolCode: string;
    title: string;
    createdAt: number;
    licenseKey: string;
    squaresClaimed: number;
    squaresPaid: number;
    pricePerSquare: number;
    isLocked: boolean;
    totalPot: number;
  };
};

export const db = init<Schema>({ appId: APP_ID });

export const createPool = async (data: {
  poolCode: string;
  title: string;
  licenseKey: string;
  pricePerSquare: number;
}) => {
  return db.transact(
    tx.pools[id()].update({
      ...data,
      createdAt: Date.now(),
      squaresClaimed: 0,
      squaresPaid: 0,
      isLocked: false,
      totalPot: 0,
    })
  );
};

export const updatePool = async (poolCode: string, data: Partial<Schema['pools']>) => {
  // Find pool by code and update
  const result = await db.queryOnce({ pools: { $: { where: { poolCode } } } });
  const pool = result.data.pools[0];
  if (pool) {
    return db.transact(tx.pools[pool.id].update(data));
  }
};

export { tx, id };
