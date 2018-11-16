#pragma once

#include <eosiolib/eosio.hpp>

class [[eosio::contract]] election : public eosio::contract
{
  public:

    election(eosio::name receiver, eosio::name code,  eosio::datastream<const char*> ds): contract(receiver, code, ds)
    {}

    [[eosio::action]] void addcandidate(std::string name);
    [[eosio::action]] void erase(uint64_t key);
    [[eosio::action]] void clear();
    [[eosio::action]] void vote(eosio::name from, uint64_t candidateid);

  private:
    // Candidates table, stores name and vote count of candidates, assigns unique id
    struct [[eosio::table]] candidate
    {
      uint64_t id;
      std::string name;
      uint64_t voteCount;

      uint64_t primary_key() const { return id;}
    };
    typedef eosio::multi_index<"candidates"_n, candidate> candidate_index;

    // Voters table, store names to prevent accounts to vote more than once
    struct [[eosio::table]] voter
    {
      eosio::name name;

      uint64_t primary_key() const { return name.value; }
    };
    typedef eosio::multi_index<"voters"_n, voter> voter_index;
};
