#![no_std]

use soroban_sdk::{
    contract, contracterror, contractevent, contractimpl, contracttype, token, Address, Env,
};

const INSTANCE_BUMP_LEDGERS: u32 = 30 * 17_280;
const INSTANCE_LIFETIME_THRESHOLD: u32 = INSTANCE_BUMP_LEDGERS - 17_280;
const BATCH_BUMP_LEDGERS: u32 = 90 * 17_280;
const BATCH_LIFETIME_THRESHOLD: u32 = BATCH_BUMP_LEDGERS - 17_280;

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum BatchStatus {
    Open,
    Deposited,
    Approved,
    Withdrawn,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct SavingsBatch {
    pub saver: Address,
    pub asset: Address,
    pub amount: i128,
    pub status: BatchStatus,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct SavingsPool {
    pub admin: Address,
    pub asset: Address,
    pub total_deposited: i128,
    pub total_withdrawn: i128,
}

#[derive(Clone)]
#[contracttype]
enum DataKey {
    Pool,
    Batch(u64),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracterror]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    BatchExists = 4,
    BatchNotFound = 5,
    InvalidStatus = 6,
    InsufficientFunds = 7,
}

#[contract]
pub struct RoundUpSavingsContract;

#[contractevent(data_format = "single-value")]
pub struct Initialized {
    pub admin: Address,
}

#[contractevent]
pub struct BatchCreated {
    pub batch_id: u64,
    pub saver: Address,
    pub amount: i128,
}

#[contractevent]
pub struct BatchDeposited {
    pub batch_id: u64,
    pub amount: i128,
}

#[contractevent]
pub struct BatchApproved {
    pub batch_id: u64,
}

#[contractevent]
pub struct BatchWithdrawn {
    pub batch_id: u64,
    pub amount: i128,
}

#[contractevent]
pub struct BatchCancelled {
    pub batch_id: u64,
}

#[contractimpl]
impl RoundUpSavingsContract {
    pub fn initialize(e: Env, admin: Address, asset: Address) -> Result<(), Error> {
        if e.storage().instance().has(&DataKey::Pool) {
            return Err(Error::AlreadyInitialized);
        }
        admin.require_auth();
        let pool = SavingsPool {
            admin: admin.clone(),
            asset,
            total_deposited: 0,
            total_withdrawn: 0,
        };
        e.storage().instance().set(&DataKey::Pool, &pool);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_LEDGERS);
        Initialized { admin }.publish(&e);
        Ok(())
    }

    pub fn get_pool(e: Env) -> Result<SavingsPool, Error> {
        Self::read_pool(&e)
    }

    pub fn create_batch(e: Env, batch_id: u64, saver: Address, amount: i128) -> Result<(), Error> {
        let pool = Self::read_pool(&e)?;
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let key = DataKey::Batch(batch_id);
        if e.storage().persistent().has(&key) {
            return Err(Error::BatchExists);
        }
        saver.require_auth();
        let batch = SavingsBatch {
            saver,
            asset: pool.asset,
            amount,
            status: BatchStatus::Open,
        };
        e.storage().persistent().set(&key, &batch);
        e.storage()
            .persistent()
            .extend_ttl(&key, BATCH_LIFETIME_THRESHOLD, BATCH_BUMP_LEDGERS);
        BatchCreated {
            batch_id,
            saver: batch.saver,
            amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn get_batch(e: Env, batch_id: u64) -> Result<SavingsBatch, Error> {
        Self::read_batch(&e, batch_id)
    }

    pub fn deposit(e: Env, batch_id: u64) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id);
        let mut batch = Self::read_batch(&e, batch_id)?;
        if batch.status != BatchStatus::Open {
            return Err(Error::InvalidStatus);
        }
        batch.saver.require_auth();
        token::Client::new(&e, &batch.asset).transfer(
            &batch.saver,
            &e.current_contract_address(),
            &batch.amount,
        );
        batch.status = BatchStatus::Deposited;
        Self::write_batch(&e, &key, &batch);
        let mut pool = Self::read_pool(&e)?;
        pool.total_deposited += batch.amount;
        Self::write_pool(&e, &pool);
        BatchDeposited {
            batch_id,
            amount: batch.amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn approve(e: Env, batch_id: u64) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id);
        let mut batch = Self::read_batch(&e, batch_id)?;
        if batch.status != BatchStatus::Deposited {
            return Err(Error::InvalidStatus);
        }
        Self::read_pool(&e)?.admin.require_auth();
        batch.status = BatchStatus::Approved;
        Self::write_batch(&e, &key, &batch);
        BatchApproved { batch_id }.publish(&e);
        Ok(())
    }

    pub fn withdraw(e: Env, batch_id: u64) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id);
        let mut batch = Self::read_batch(&e, batch_id)?;
        if batch.status != BatchStatus::Approved {
            return Err(Error::InvalidStatus);
        }
        batch.saver.require_auth();
        let client = token::Client::new(&e, &batch.asset);
        if client.balance(&e.current_contract_address()) < batch.amount {
            return Err(Error::InsufficientFunds);
        }
        client.transfer(&e.current_contract_address(), &batch.saver, &batch.amount);
        batch.status = BatchStatus::Withdrawn;
        Self::write_batch(&e, &key, &batch);
        let mut pool = Self::read_pool(&e)?;
        pool.total_withdrawn += batch.amount;
        Self::write_pool(&e, &pool);
        BatchWithdrawn {
            batch_id,
            amount: batch.amount,
        }
        .publish(&e);
        Ok(())
    }

    pub fn cancel(e: Env, batch_id: u64) -> Result<(), Error> {
        let key = DataKey::Batch(batch_id);
        let mut batch = Self::read_batch(&e, batch_id)?;
        if batch.status != BatchStatus::Open {
            return Err(Error::InvalidStatus);
        }
        batch.saver.require_auth();
        batch.status = BatchStatus::Cancelled;
        Self::write_batch(&e, &key, &batch);
        BatchCancelled { batch_id }.publish(&e);
        Ok(())
    }
}

impl RoundUpSavingsContract {
    fn read_pool(e: &Env) -> Result<SavingsPool, Error> {
        e.storage()
            .instance()
            .get(&DataKey::Pool)
            .ok_or(Error::NotInitialized)
    }
    fn write_pool(e: &Env, pool: &SavingsPool) {
        e.storage().instance().set(&DataKey::Pool, pool);
        e.storage()
            .instance()
            .extend_ttl(INSTANCE_LIFETIME_THRESHOLD, INSTANCE_BUMP_LEDGERS);
    }
    fn read_batch(e: &Env, id: u64) -> Result<SavingsBatch, Error> {
        e.storage()
            .persistent()
            .get(&DataKey::Batch(id))
            .ok_or(Error::BatchNotFound)
    }
    fn write_batch(e: &Env, key: &DataKey, batch: &SavingsBatch) {
        e.storage().persistent().set(key, batch);
        e.storage()
            .persistent()
            .extend_ttl(key, BATCH_LIFETIME_THRESHOLD, BATCH_BUMP_LEDGERS);
    }
}

#[cfg(test)]
mod test {
    extern crate std;
    use super::{BatchStatus, Error, RoundUpSavingsContract, RoundUpSavingsContractClient};
    use soroban_sdk::{testutils::Address as _, token, Address, Env};

    fn setup<'a>(e: &'a Env) -> (RoundUpSavingsContractClient<'a>, Address, Address, Address) {
        let admin = Address::generate(e);
        let saver = Address::generate(e);
        let asset = e
            .register_stellar_asset_contract_v2(Address::generate(e))
            .address();
        let id = e.register(RoundUpSavingsContract, ());
        let client = RoundUpSavingsContractClient::new(e, &id);
        e.mock_all_auths();
        client.initialize(&admin, &asset);
        (client, admin, saver, asset)
    }

    #[test]
    fn deposit_approve_withdraw_round_trip() {
        let e = Env::default();
        let (client, _admin, saver, asset) = setup(&e);
        client.create_batch(&1, &saver, &100_i128);
        let token_client = token::StellarAssetClient::new(&e, &asset);
        token_client.mint(&saver, &100_i128);
        client.deposit(&1);
        client.approve(&1);
        client.withdraw(&1);
        assert_eq!(client.get_batch(&1).status, BatchStatus::Withdrawn);
        assert_eq!(token_client.balance(&saver), 100);
    }

    #[test]
    fn approval_requires_deposit() {
        let e = Env::default();
        let (client, _admin, saver, _asset) = setup(&e);
        client.create_batch(&2, &saver, &100_i128);
        assert_eq!(
            client.try_approve(&2).unwrap_err().unwrap(),
            Error::InvalidStatus
        );
    }

    #[test]
    fn cancel_open_batch() {
        let e = Env::default();
        let (client, _admin, saver, _asset) = setup(&e);
        client.create_batch(&3, &saver, &100_i128);
        client.cancel(&3);
        assert_eq!(client.get_batch(&3).status, BatchStatus::Cancelled);
    }
}
