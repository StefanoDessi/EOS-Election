#include "election.hpp"

using namespace eosio;

/**
 * Adds a candidate to the candidate table, the id is generated using
 * the first available primary key and the voteCount is initialized at 0
 * @param name Name of new candidate
 */
void election::addcandidate(std::string name)
{
  // Require deployer of contract's authority to add candidates
  require_auth(_self);

  // Declare index to access the candidates table
  candidate_index candidates(_code, _code.value);

  // Emplace a new row on the table
  candidates.emplace(_self, [&]( auto& row )
  {
    row.id = candidates.available_primary_key(); //get first available id
    row.name = name; //use the provided name for the candidate
    row.voteCount = 0; //initialize voteCount at 0
  });
}
/**
 * Erase candidate function
 * @param key ID of candidate to be erased from the table
 */
void election::erase(uint64_t key)
{
  require_auth(_self);
  candidate_index candidates(_self, _code.value);
  auto iterator = candidates.find(key);
  eosio_assert(iterator != candidates.end(), "Record does not exist");
  candidates.erase(iterator);
}

/**
 * Clears both candidates and voters tables
 */
void election::clear()
{
  require_auth(_self);
  candidate_index candidates(_self, _code.value);
  voter_index voters(_self, _code.value);

  std::vector<uint64_t> candidateKeys;
  for(auto& item : candidates)
  {
    candidateKeys.push_back(item.id);
  }
  for (uint64_t key : candidateKeys)
  {
      auto itr = candidates.find(key);
      if (itr != candidates.end())
      {
          candidates.erase(itr);
      }
  }

  std::vector<uint64_t> voterKeys;
  for(auto& item : voters)
  {
    voterKeys.push_back(item.name.value);
  }
  for (auto& key : voterKeys)
  {
      auto itr = voters.find(key);
      if (itr != voters.end())
      {
          voters.erase(itr);
      }
  }
}

/**
 * Casts a vote from the specified account to one of the candidates
 * @param from        Voting account's name
 * @param candidateid ID of the voted candidate
 */
void election::vote(name from, uint64_t candidateid)
{
  // Confirm account identity
  require_auth(from);

  // Declare indexes to interact with the tables
  candidate_index candidates(_self, _code.value);
  voter_index voters(_self, _code.value);

  // Check if user already voted
  auto voter_iterator = voters.find(from.value);
  eosio_assert(voter_iterator == voters.end(), "User already voted");

  // Find candidate row
  auto candidate_iterator = candidates.find(candidateid);
  eosio_assert(candidate_iterator != candidates.end(), "Candidate does not exist");

  // Add voter to table
  voters.emplace(_self, [&]( auto& row )
  {
    row.name = from;
  });

  // Increment candidate vote count
  candidates.modify(candidate_iterator, get_self(), [&](auto& c) {
            c.voteCount = c.voteCount + 1;
        });
}

EOSIO_DISPATCH(election,(addcandidate)(erase)(vote)(clear))
