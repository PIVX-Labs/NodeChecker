#!/bin/bash
# The goal here is to create a .env file with the required enviornment varibles to connect to the pivx daemon.
# In the future this will also be used to download and install a daemon if one doesn't exist

#Create the env file
if [ -e .env ]
then
    echo "Environment varibles already created, delete or edit the .env file to change the configuration"
else
    file=".env"
    #RPC SETTINGS
    read -p "RPC wallet Port: " rpcPort
    echo "WALLET_PORT="$rpcPort > $file
    read -p "RPC wallet user: " rpcUser
    echo "WALLET_USER="$rpcUser >> $file
    read -p "RPC wallet Password: " rpcPassword
    echo "WALLET_PASSWORD="$rpcPassword >> $file
    #EMAIL SETTINGS
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
    #ADMIN PANNEL SETTINGS
    read -p "Do you want the node to connect to or create an admin panel (cnc module)? (Y/n): " cncyesno
    case $cncyesno in
        #Ask if we are going to create the admin panel with this node
        [yY]) echo "adminPanelSystemEnabled=t" >> $file;
            read -p "Use this node as an admin panel? (y/n)" : adminpanel;
            echo "ADMIN_PANEL: " adminpanel
            if [adminpanel == y]
            then
                #We are using this node as the admin backend
                #If so make sure everything is port forwarded correctly or has an open firewall
                read -p "Please verify that you have opened the approprate ports and this node is connectable" portsAreOpen
                #Make the user create a username and password and store that
                read -p "Create a username that you wish to use :" : adminPanelUserName
                echo "ADMIN_PANEL_USER=" adminPanelUserName
                read -p "Create a password that you wish to use :" : adminPanelPassword
                echo "ADMIN_PANEL_PASSWORD=" adminPanelPassword
                #We need to update these on the first login to store them more securly and remove them from here
                #This is mainly just to allow for ease of use
            else
                #We aren't using this node as the admin backend
                #If not then ask for the ip or url to the system that is running the admin panel and user/pass
                read -p "Enter the IP address of the admin panel:" adminPanelIpAdress
                echo "ADMIN_PANEL_IP=" adminPanelIpAdress
                read -p "Enter the API key for this node, you can create that in admin panel" adminPanelAPINode
                echo "ADMIN_PANEL_API=" adminPanelAPINode
            fi
            
    esac
    #DAEMON SETTINGS
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

#Start the node module
node index.js