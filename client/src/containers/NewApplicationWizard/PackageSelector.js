import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
import Auth from "../../helpers/auth0";
import 'plyr/dist/plyr.css'
import {Button} from "../UiElements/Button/button.style";
import NavigateBeforeIcon from '@material-ui/icons/NavigateBefore';
import NavigateNextIcon from '@material-ui/icons/NavigateNext';
import SkipNextIcon from '@material-ui/icons/SkipNext';
import "./PackageSelector.scss";
import DoneIcon from '@material-ui/icons/Done';


class PackageInfo extends Component
{
    onClick()
    {
        this.props.onClick();
    }


    render()
    {
        return <div className={"package-info"} onClick={() => this.onClick()}>
            <div className={"package-top-sections"}>
                <div className={"package-header"}>
                    <h3>{this.props.title}</h3>
                </div>
                <div className={"package-price"}>
                    <span className={"price-main"}>{this.props.pricing}</span>
                    <br/>
                    <span className={"price-sub"}>{this.props.pricingSubText}</span>
                </div>

                <div className={"package-description"}>
                    <ul>
                        {
                            this.props.packageDescriptions.map((description) =>
                            {
                                return <li>{description}</li>;
                            })
                        }
                    </ul>
                </div>
            </div>
            {
                this.props.selected ?
                    <div className={"package-selected"}>
                        <DoneIcon/>
                        <span>Selected</span>
                    </div> :
                    <div className={"select-package-button"}>
                        <Button variant="contained"
                                size="medium"
                                color={"primary"}
                                title={"Select Package"}>
                            <span>{this.props.selectionButtonText || "Select Package"}</span>
                        </Button>
                    </div>
            }
        </div>;
    }
}




class PackageSelector extends Component {
    state = {
        grandfatheredPackage: null
    };

    componentDidMount()
    {
        const userData = Auth.getUserInfo();
        this.setState({grandfatheredPackage: userData['https://kwola.io/package']})
    }

    setSelected(packageName)
    {
        this.setState({selected: packageName});
        if (this.props.onChangePackage)
        {
            this.props.onChangePackage(packageName);
        }
    }

    enterpriseClicked()
    {
        window.open("https://kwola.io/book-a-demo");
    }
    render()
    {
        const { result } = this.state;

        let oneOffPrice = "$99.99";
        let monthlyPrice = "$199.99 / month";
        let extraRunPrice = "$29.99";
        if (this.state.grandfatheredPackage === 'package_100')
        {
            oneOffPrice = "$49.99";
            monthlyPrice = "$99.99 / month"
            extraRunPrice = "$14.99"
        }

        return (
            <div className={"package-selector"}>
                {
                    !this.props.hideOneTime ?
                        <PackageInfo
                            title={"One-off Testing Run"}
                            pricing={oneOffPrice}
                            pricingSubText={"One time"}
                            packageDescriptions={[
                                "Use Kwola before a major client meeting or big release",
                                "Kwola will do a single thorough, large sized run",
                                "The AI will learn from scratch while testing your application"
                            ]}
                            selected={this.props.selectedPackage === "once"}
                            onClick={() => this.setSelected("once")}
                        /> : null
                }
                <PackageInfo
                    title={"Recurring Testing"}
                    pricing={monthlyPrice}
                    pricingSubText={<span>Extra runs for {extraRunPrice}</span>}
                    packageDescriptions={[
                        "Get 5 testing runs each month included",
                        "Launch Kwola every week, on specific dates of the month, manually through the UI, or based on API calls",
                        "Kwola's AI gets smarter and smarter over time, making it more and more likely it will find obscure and rare bugs",
                        "Cancel anytime in first 30 days without being charged."
                    ]}
                    selected={this.props.selectedPackage === "monthly"}
                    onClick={() => this.setSelected("monthly")}
                />
                <PackageInfo
                    title={"Enterprise"}
                    pricing={"Contact Us"}
                    pricingSubText={""}
                    packageDescriptions={[
                        "Use Kwola in complex, multi-domain environments with many different technology stacks",
                        "Allow multiple users access to your Kwola account and share bugs.",
                        "Have custom plugins created by the Kwola team to support your unique requirements",
                        "Our team will help you setup and integrate Kwola to ensure you get the most out of it."
                    ]}
                    selectionButtonText={"Contact Us"}
                    selected={false}
                    onClick={() => this.enterpriseClicked()}
                />
            </div>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.PackageSelector} };
export default connect(mapStateToProps)(PackageSelector);

