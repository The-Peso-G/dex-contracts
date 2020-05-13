import {
  decodeOrders,
  decodeIndexedOrders,
  Order,
  IndexedOrder,
} from "./encoding";
import { BatchExchangeViewer } from "../build/types/BatchExchangeViewer";
import { BatchExchange } from "../build/types/BatchExchange";
import BN from "bn.js";

/**
 * Returns an iterator yielding an item for each page of order in the orderbook that is currently being collected.
 * @param {BatchExchangeViewer} contract to query from
 * @param {number} pageSize the number of items to fetch per page
 * @param {number?} blockNumber the block number to execute the query at, defaults to "latest" if omitted
 */
export const getOpenOrdersPaginated = async function* (
  contract: BatchExchangeViewer,
  pageSize: number,
  blockNumber: number | null,
): AsyncGenerator<IndexedOrder<BN>[]> {
  let nextPageUser = "0x0000000000000000000000000000000000000000";
  let nextPageUserOffset = "0";
  let hasNextPage = true;

  if (blockNumber) {
    contract = contract.clone();
    contract.defaultBlock = blockNumber;
  }

  while (hasNextPage) {
    const page = await contract.methods
      .getOpenOrderBookPaginated([], nextPageUser, nextPageUserOffset, pageSize)
      .call();
    const elements = decodeIndexedOrders(page.elements);
    yield elements;

    //Update page info
    hasNextPage = page.hasNextPage;
    nextPageUser = page.nextPageUser;
    nextPageUserOffset = page.nextPageUserOffset;
  }
};

/**
 * Returns open orders in the orderbook.
 * @param {BatchExchangeViewer} contract to query from
 * @param {number} pageSize the number of items to fetch per page
 * @param {number?} blockNumber the block number to execute the query at, defaults to "latest" if omitted
 */
export const getOpenOrders = async (
  contract: BatchExchangeViewer,
  pageSize: number,
  blockNumber: number | null,
): Promise<IndexedOrder<BN>[]> => {
  let allOrders: IndexedOrder<BN>[] = [];
  for await (const page of getOpenOrdersPaginated(
    contract,
    pageSize,
    blockNumber,
  )) {
    allOrders = allOrders.concat(page);
  }
  return allOrders;
};

/**
 * Returns all orders in the orderbook.
 * @param {BatchExchange} contract to query from
 * @param {number} pageSize the number of items to fetch per page
 * @param {number?} blockNumber the block number to execute the query at, defaults to "latest" if omitted
 */
export const getOrdersPaginated = async (
  contract: BatchExchange,
  pageSize: number,
  blockNumber: number | null,
): Promise<Order<BN>[]> => {
  let orders: Order<BN>[] = [];
  let currentUser = "0x0000000000000000000000000000000000000000";
  let currentOffSet = 0;
  let lastPageSize = pageSize;

  if (blockNumber) {
    contract = contract.clone();
    contract.defaultBlock = blockNumber;
  }

  while (lastPageSize == pageSize) {
    const page = decodeOrders(
      await contract.methods
        .getEncodedUsersPaginated(currentUser, currentOffSet, pageSize)
        .call(),
    );
    orders = orders.concat(page);
    for (const index in page) {
      if (page[index].user != currentUser) {
        currentUser = page[index].user;
        currentOffSet = 0;
      }
      currentOffSet += 1;
    }
    lastPageSize = page.length;
  }
  return orders;
};
