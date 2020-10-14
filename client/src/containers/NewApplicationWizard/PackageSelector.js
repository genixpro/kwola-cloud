import React, { Component } from 'react';
import {connect, Provider} from 'react-redux';
import Papersheet, { DemoWrapper } from '../../components/utility/papersheet';
import { FullColumn , HalfColumn, OneThirdColumn, TwoThirdColumn, Row, Column} from '../../components/utility/rowColumn';
import axios from "axios";
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
                            <span>Select Package</span>
                        </Button>
                    </div>
            }
        </div>;
    }
}




class PackageSelector extends Component {
    state = {

    };

    componentDidMount()
    {

    }

    setSelected(packageName)
    {
        this.setState({selected: packageName})
        if (this.props.onChangePackage)
        {
            this.props.onChangePackage(packageName);
        }
    }

    render()
    {
        const { result } = this.state;

        return (
            <div className={"package-selector"}>
                {
                    !this.props.hideOneTime ?
                        <PackageInfo
                            title={"One-off Testing Run"}
                            pricing={"$49.99"}
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
                    pricing={"$99.99 / month"}
                    pricingSubText={<span>First Month Free!</span>}
                    packageDescriptions={[
                        "Get 5 testing runs each month",
                        "Launch Kwola every week or on specific dates of the month",
                        "Kwola's AI gets smarter and smarter over time, making it more and more likely it will find obscure and rare bugs",
                        "Your first month is free, cancel anytime"
                    ]}
                    selected={this.props.selectedPackage === "monthly"}
                    onClick={() => this.setSelected("monthly")}
                />
                <PackageInfo
                    title={"Pay As You Go"}
                    pricing={"$14.99 / testing run"}
                    pricingSubText={"Min 10 runs / month"}
                    packageDescriptions={[
                        "Launch Kwola daily, any time new code is committed, or any time your deployment pipeline runs",
                        "Kwola's AI gets smarter and smarter over time, making it more and more likely it will find obscure and rare bugs",
                        "Cancel anytime"
                    ]}
                    selected={this.props.selectedPackage === "pay_as_you_go"}
                    onClick={() => this.setSelected("pay_as_you_go")}
                />
            </div>
        );
    }
}

const mapStateToProps = (state) => {return { ...state.PackageSelector} };
export default connect(mapStateToProps)(PackageSelector);

