# !/bin/bash
# The goal here is to create a .env file with the required enviornment varibles to connect to the pivx daemon.
# In the future this will also be used to download and install a daemon if one doesn't exist

# Create the env file
if [ -e .env ]
then
    echo "Environment varibles already created, delete or edit the .env file to change the configuration"
else
    # Masternode
    read -p "Would you like to set this daemon up as a masternode?: " setUpAsMasternode
    case setUpAsMasternode in
        [yY]) "masternode=1" >> "$homedir/.pivx/pivx.conf"
            read -p "external Ip address: " externalIpAddress;
            echo "externalip="$externalIpAddress >> "$homedir/.pivx/pivx.conf"
            read -p "masternode addr (external Ip with port): " masternodeAddress;
            echo "masternodeaddr="$masternodeAddress >> "$homedir/.pivx/pivx.conf";
            read -p "masternode private key: " masternodeprivkey; 
            echo "masternodeprivkey="$masternodeprivkey;;
        [nN]) echo "This daemon will not be a masternode"
    # Check if a pivx config file exists
    file=".env"
    if [ -f "${input/\~/$HOME/.pivx/pivx.conf}"]
    then
    echo "pivx config file exists"
    # Ask to load if a user would like to load the information
    read -p "Would you like us to autoload the pivx config file?: " autoloadpivxconf
    case $autoloadpivxconf in
        [yY]) echo "Reading from file";
            homedir=$( getent passwd "$USER" | cut -d: -f6 )
            source "$homedir/.pivx/pivx.conf";
            echo "WALLET_PORT="$rpcport > $file;
            echo "WALLET_USER="$rpcuser >> $file;
            echo "WALLET_PASSWORD="$rpcpassword >> $file;
            echo "loaded configs";;
        [nN])     
            # RPC SETTINGS
            read -p "RPC wallet Port: " rpcPort;
            echo "WALLET_PORT="$rpcPort > $file;
            read -p "RPC wallet user: " rpcUser;
            echo "WALLET_USER="$rpcUser >> $file;
            read -p "RPC wallet Password: " rpcPassword;
            echo "WALLET_PASSWORD="$rpcPassword >> $file;;
    esac
    fi


    # EMAIL SETTINGS
    read -p "Do you want to set up SMTP? (Y/n): " smtpyesno
    case $smtpyesno in
        [yY]) echo "SMTP_YES_NO=t" >> $file;
            read -p "SMTP HOST: " smtphost;
            echo "SMTP_HOST="$smtphost >> $file;
            read -p "SMTP PORT: " smtpport;
            if [ $smtpport == 465 ]
            then
                echo "SMTP_SEC=t">>$file;
                echo "SMTP_PORT="$smtpport;
            else
                echo "SMTP_SEC=f">>$file;
                echo "SMTP_PORT="$smtpport;
            fi
            read -p "SMTP username: " smtpuser;
            echo "SMTP_USER="$smtpuser >> $file;
            read -p "SMTP password: " smtppass;
            echo "SMTP_PASS="$smtppass;
            read -p "Email you wish to send to: " smtpreceiv;
            echo "SMTP_RECEIVER="$smtpreceiv;;

        [nN]) echo "SMTP_YES_NO=f">> $file;; 
    esac
    # ADMIN PANNEL SETTINGS
    read -p "Do you want the node to connect to or create an admin panel (cnc module)? (Y/n): " cncyesno
    case $cncyesno in
        # Ask if we are going to create the admin panel with this node
        [yY]) echo "adminPanelSystemEnabled=t" >> $file;
            read -p "Use this node as an admin panel? (y/n)" : adminpanel;
            echo "ADMIN_PANEL: " adminpanel
            if [adminpanel == y]
            then
                # We are using this node as the admin backend
                # If so make sure everything is port forwarded correctly or has an open firewall
                read -p "Please verify that you have opened the approprate ports and this node is connectable" portsAreOpen
                # Make the user create a username and password and store that
                read -p "Create a username that you wish to use :" : adminPanelUserName
                echo "ADMIN_PANEL_USER=" adminPanelUserName
                read -p "Create a password that you wish to use :" : adminPanelPassword
                echo "ADMIN_PANEL_PASSWORD=" adminPanelPassword
                # We need to update these on the first login to store them more securly and remove them from here
                # This is mainly just to allow for ease of use
            else
                # We aren't using this node as the admin backend
                # If not then ask for the ip or url to the system that is running the admin panel and user/pass
                read -p "Enter the IP address of the admin panel:" adminPanelIpAdress
                echo "ADMIN_PANEL_IP=" adminPanelIpAdress
                read -p "Enter the API key for this node, you can create that in admin panel" adminPanelAPINode
                echo "ADMIN_PANEL_API=" adminPanelAPINode
            fi
            
    esac
    # Download bootstrap it gets stuck or forked
    # Probably will do this if it won't move within x amount of minutes (defaulting to an 30 minutes or 30 blocks)
    read -p "Download and load bootstrap if the wallet gets stuck: " bootstrap
    case $bootstrap in 
        [yY]) echo "BOOTSTRAP=t" >> $file;
            read -p "Path to data directory (default ~/.pivx): " dataDirectory;
            echo "DATA_DIRECTORY="$dataDirectory >>$file;;
        [nN]) echo "BOOTSTRAP=f">> $file;;
        *) echo "invalid response defaulting to false";;
    esac
    # Ask if we want to bootstrap if forked
    read -p "Download and load bootstrap if wallet is forked: (Y/n) " bootstrapFork
    case $bootstrapFork in
        [yY]) echo "BOOTSTRAP_FORK=t" >> $file;;
        *) echo "BOOTSTRAP_FORK=f" >> $file;;
    esac

    # DAEMON SETTINGS
    read -p "Restart Wallet every 15 minutes?: (Y/n) " restartWallet
    case $restartWallet in 
        [yY]) echo "RESTART_WALLET=t" >> $file;
            read -p "Path to daemon directory (example ~/Downloads/pivx-5.5.0/bin): " daemonDirectory;
            echo "DAEMON_DIRECTORY="$daemonDirectory >>$file;;
        [nN]) echo "RESTART_WALLET=f">> $file;;
        *) echo "invalid response defaulting to false";;
    esac
    cat $file
fi

# Start the node module
node index.js