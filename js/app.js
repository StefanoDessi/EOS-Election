App = {
  contracts: {},
  account: '0x0',
  current_state: null,
  scatter_network: null,
  eos_config: null,
  endpoints: [
    {
      host: "dev.cryptolions.io",
      port: 38888,
      chainId: "038f4b0fc8ff18a4f0842a8f0564611f6e96e8535901dd45e43ac8691a1c4dca",
      hosts: ["lion12342221","lion12342222"]
    },
    {
      host: "api.kylin.alohaeos.com",
      port:80,
      chainId: "5fff1dae8dc8e2fc4d5b23b2c7665c97f9e9d8edf2b6485a86ba311c25639191",
      hosts: ["lion12342221"]
    },
    {
      host: "127.0.0.1",
      port: 8888,
      chainId: '6cbecff836a9fa60da53bf97a0a180103b2e76041d4414693d11bf39e2341547',
      hosts: []
    }

  ],

  init: function()
  {
    ScatterJS.scatter.connect("APT_EOS_ELECTION").then(connected => {

    // User does not have Scatter Desktop, Mobile or Classic installed.
    if(!connected) return false;

    App.scatter = ScatterJS.scatter;

    network =  {
        blockchain:'eos',
        protocol:'http',
        host: App.endpoint.host,
        port: App.endpoint.port,
        chainId: App.endpoint.chainId
    }
    App.scatter_network = network;

    App.scatter.getIdentity({accounts: [network]}).then(identity => {
        if(identity.accounts && identity.accounts.length == 1)
        {
          App.account = identity.accounts[0].name;
          App.contracts.Election = App.scatter.eos(network, Eos, {})
          return App.initContract();
        }
    });
    });
  },
  initContract: function() {
    var check_deployed = function(){
      App.contracts.Election.getTableRows(true,App.host,App.host,"candidates").catch(
        function(err)
        {
        });
    }
    check_deployed();
    App.listenForEvents();
    return App.render();
  },

  render: function()
  {
    var electionInstance;
    var loader = $("#loader");
    var content = $("#content");
    loader.show();
    content.hide();
    $("#accountAddress").html("Your Account: " + App.account + "<br> Election Host Account: " + App.host);

    // Load contract data
    App.contracts.Election.getTableRows(true,App.host,App.host,"candidates").then(
      function(result)
      {
        current_state = result;

        var candidatesResults = $("#candidatesResults");
        candidatesResults.empty();

        var candidatesSelect = $('#candidatesSelect');
        candidatesSelect.empty();

        rows = result.rows;
        for (var i = 0; i < rows.length; i++)
        {
          var id = rows[i].id;
          var name = rows[i].name;
          var voteCount = rows[i].voteCount;

          // Render candidate Result
          var candidateTemplate = "<tr><th>" + id + "</th><td>" + name + "</td><td>" + voteCount + "</td></tr>";
          candidatesResults.append(candidateTemplate);

          // Render candidate ballot option
          var candidateOption = "<option value='" + id + "' >" + name + "</option>"
          candidatesSelect.append(candidateOption);
        }
        return(App.contracts.Election.getTableRows(true,App.host,App.host,"voters",1,App.account,App.account+1));
      }
    ).then(function(hasVoted)
    {
      // Do not allow the user to vote if its name is found on the table
      if(hasVoted.rows.length)
      {
        $('form').hide();
      }
      else
      {
        $('form').show();
      }
      loader.hide();
      content.show();
    }).catch(function(error) {
      console.warn(error);
    });
  },

  castVote: function()
  {
    var candidateId = $('#candidatesSelect').val();
    App.contracts.Election.transaction(
      {
        actions: [
          {
            account: App.host,
            name: 'vote',
            authorization: [{
              actor: App.account,
              permission: 'active'
            }],
            data: {
              from: App.account,
              candidateid: candidateId
            }
          }
        ]
      }
    ).then(function(result) {
    $("#content").hide();
    $("#loader").show();
    }).catch(function(err) {
        console.error(err);
      });

  },
  listenForEvents: function()
  {
    App.updateListener = setInterval(function() {
      App.contracts.Election.getTableRows(true,App.host,App.host,"candidates").then(
        function(result)
        {
          if(JSON.stringify(result)!=JSON.stringify(current_state))
          {
            App.render();
          }
        });
    }, 10000);
  },
  hostChange: function()
  {
    App.host = $("#hostSelect").val();
    App.render();
  },
  endpointChange: function()
  {
    App.endpoint = App.endpoints[$("#endpointSelect").val()];
    $("#hostSelect").empty();
    for(j=0;j<App.endpoint.hosts.length;j++)
    {
      $("#hostSelect").append(new Option(App.endpoint.hosts[j]));
    }
    App.host = $("#hostSelect").val();
    if(App.scatter) App.scatter.forgetIdentity();
    clearInterval(App.updateListener);
    App.init();
  },
  logout: function()
  {
    App.scatter.forgetIdentity();
    $("#content").hide();
    $("#loader").show();
    clearInterval(App.updateListener);
    App.init();
  }

};

$(function() {
  $(window).load(function()
  {
    for(i=0;i<App.endpoints.length;i++)
    {
      $("#endpointSelect").append(new Option(App.endpoints[i].host + ":" + App.endpoints[i].port, i));
    }
    start_endpoint = App.endpoints[$("#endpointSelect").val()];
    for(j=0;j<start_endpoint.hosts.length;j++)
    {
      $("#hostSelect").append(new Option(start_endpoint.hosts[j]));
    }
    App.endpoint = start_endpoint;
    App.host = $("#hostSelect").val();
    ScatterJS.plugins( new ScatterEOS() );
    App.init();
  });
});
