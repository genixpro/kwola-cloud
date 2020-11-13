import React, { Component } from 'react';
import {Button} from "../../containers/UiElements/Button/button.style";
import CircularProgress from "../uielements/circularProgress";
import Icon from "../uielements/icon";

class LoaderButton extends Component {
    state = {
        isPerformingAction: false,
        isShowingSuccessIcon: false,
        isShowingFailureIcon: false
    };

    constructor()
    {
        super();
        this.minimumActionTime = 500;
        this.showSuccessIconTime = 1500;
        this.showFailureIconTime = 2500;
    }


    showSuccessIcon()
    {
        this.setState({
            isPerformingAction: false,
            isShowingSuccessIcon: true,
            isShowingFailureIcon: false
        });

        setTimeout(() =>
        {
            this.setState({isShowingSuccessIcon: false});
        }, this.showSuccessIconTime)
    }

    showFailureIcon()
    {
        this.setState({
            isPerformingAction: false,
            isShowingSuccessIcon: false,
            isShowingFailureIcon: true
        });

        setTimeout(() =>
        {
            this.setState({isShowingFailureIcon: false});
        }, this.showFailureIconTime)
    };

    onClick()
    {
        if (this.props.onClick && !this.state.isPerformingAction && !this.state.isShowingSuccessIcon && !this.state.isShowingFailureIcon)
        {
            const promise = this.props.onClick();
            if (promise)
            {
                this.setState({isPerformingAction: true});
                const startTime = new Date();
                promise.then((result) =>
                {
                    const nowTime = new Date();
                    const delayTime = this.minimumActionTime - (nowTime.getDate() - startTime.getDate());

                    if (delayTime > 0)
                    {
                        setTimeout(() => this.showSuccessIcon(), delayTime);
                    }
                    else
                    {
                        this.showSuccessIcon();
                    }

                    return result;
                }, (error) =>
                {
                    const nowTime = new Date();
                    const delayTime = this.minimumActionTime - (nowTime.getDate() - startTime.getDate());

                    if (delayTime > 0)
                    {
                        setTimeout(() => this.showFailureIcon(), delayTime);
                    }
                    else
                    {
                        this.showFailureIcon();
                    }

                    return error;
                });
            }
        }
    }


    render() {
        return (
            <Button id={this.props.id}
                    variant="extended"
                    color={this.props.color || "primary"}
                    disabled={this.props.disabled}
                    className={`orderBtn ${this.props.className}`}
                    title={this.props.title}
                    onClick={() => this.onClick()}>
                {this.props.children}
                {
                    this.state.isPerformingAction ?
                        <span style={{"paddingLeft": "20px"}}><CircularProgress size={14} style={{"color": "white"}}/></span> : null
                }
                {
                    this.state.isShowingSuccessIcon ?
                        <Icon className="fontSizeSmall">check</Icon> : null
                }
                {
                    this.state.isShowingFailureIcon ?
                        <Icon className="fontSizeSmall">close</Icon> : null
                }
            </Button>

        );
    }
}

export default LoaderButton;
