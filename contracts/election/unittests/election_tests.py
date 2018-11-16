import unittest
from eosfactory.eosf import *

verbosity([Verbosity.INFO, Verbosity.OUT, Verbosity.TRACE, Verbosity.DEBUG])

CONTRACT_WORKSPACE = "_wslqwjvacdyugodewiyd"

#Please make sure that your EosFactory installation is properly configured to support EOSIO.CDT and that the Election smart contract is present in your contracts directory
class Test(unittest.TestCase):

    def run(self, result=None):
        super().run(result)


    @classmethod
    def setUpClass(cls):
        SCENARIO('''
        Create a contract from template, then build and deploy it.
        ''')
        reset()
        create_master_account("master")

        COMMENT('''
        Create test accounts:
        ''')
        create_account("alice", master)
        create_account("carol", master)

    def setUp(self):
        pass


    def test_01(self):
        COMMENT('''
        Create, build and deploy the contract:
        ''')
        create_account("host", master)

        contract = Contract(host, "election")
        contract.build()
        contract.deploy()

    def test_02(self):
        COMMENT('''
        Test add candidate:
        ''')
        t = host.table("candidates", host)
        self.assertEqual(len(t.json["rows"]), 0)
        host.push_action(
            "addcandidate", {"name": "Bob"}, permission=(host, Permission.ACTIVE))

        t = host.table("candidates", host)
        self.assertEqual(t.json["rows"][0]["id"], 0)
        self.assertEqual(t.json["rows"][0]["name"], "Bob")
        self.assertEqual(t.json["rows"][0]["voteCount"], 0)
        self.assertEqual(len(t.json["rows"]), 1)

        COMMENT('''
        WARNING: This action should fail because only the host can add candidates
        ''')
        with self.assertRaises(MissingRequiredAuthorityError):
            host.push_action(
                "addcandidate", {"name": "Wally"}, permission=(carol, Permission.ACTIVE))
        self.assertEqual(len(t.json["rows"]), 1)

    def test_03(self):
        COMMENT('''
        Test add vote:
        ''')
        t = host.table("voters", host)
        self.assertEqual(len(t.json["rows"]), 0)

        COMMENT('''
        WARNING: This action should fail due to authority mismatch!
        ''')
        with self.assertRaises(MissingRequiredAuthorityError):
            host.push_action(
                "vote", {"from": alice, "candidateid": 0}, permission=(carol, Permission.ACTIVE))
        t = host.table("voters", host)
        self.assertEqual(len(t.json["rows"]), 0)

        host.push_action(
            "vote", {"from": alice, "candidateid": 0}, permission=(alice, Permission.ACTIVE))

        t = host.table("candidates", host)
        self.assertEqual(t.json["rows"][0]["id"], 0)
        self.assertEqual(t.json["rows"][0]["voteCount"], 1)

        t = host.table("voters", host)
        self.assertEqual(t.json["rows"][0]["name"], alice.name)
        self.assertEqual(len(t.json["rows"]), 1)

        COMMENT('''
        WARNING: This action should fail because alice already voted!
        ''')
        with self.assertRaises(Error):
            host.push_action(
                "vote", {"from": alice, "candidateid": 0}, permission=(alice, Permission.ACTIVE))
        COMMENT('''
        WARNING: This action should fail because the candidate doesn't exists
        ''')
        with self.assertRaises(Error):
            host.push_action(
                "vote", {"from": carol, "candidateid": 1}, permission=(carol, Permission.ACTIVE))

    def tearDown(self):
        pass


    @classmethod
    def tearDownClass(cls):
        stop()


if __name__ == "__main__":
    unittest.main()
    reset()
