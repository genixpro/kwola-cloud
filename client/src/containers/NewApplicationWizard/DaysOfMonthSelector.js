import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import {connect, Provider} from 'react-redux';
import {Button} from "../UiElements/Button/button.style";
import "./DayOfMonthSelector.scss";

class DaysOfMonthSelector extends Component {
    state = {}

    countDaysActivated()
    {
        let count = 0;
        for (let key of Object.keys(this.props.value))
        {
            if (this.props.value[key])
            {
                count += 1;
            }
        }
        return count;
    }

    toggleDaysOfMonthEnabled(weekOfMonth, dayOfWeek)
    {
        const dayIndex = this.dayIndexFor(weekOfMonth, dayOfWeek);
        const datesOfMonth = this.props.value;

        if (!datesOfMonth[dayIndex] && this.isAtMaximumDays())
        {
            return;
        }

        datesOfMonth[dayIndex] = !datesOfMonth[dayIndex];
        if (this.props.onChange)
        {
            this.props.onChange(datesOfMonth);
        }
    }

    dayIndexFor(weekOfMonth, dayOfWeek)
    {
        return weekOfMonth * 7 + dayOfWeek;
    }

    isAtMaximumDays()
    {
        if (this.props.maxDaysSelected)
        {
            if (this.countDaysActivated() >= this.props.maxDaysSelected)
            {
                return true;
            }
        }
    }

    render()
    {
        const isAtMaximum = this.isAtMaximumDays();

        return <div className={"days-of-month-selector"}>
            {
                [0,1,2,3,4].map((weekOfMonth) =>
                    <div className={"week-row"}>
                        <div style={{"flexBasis": "100px", "marginTop": "20px", "flexGrow":"0"}}>{weekOfMonth === 0 ? <span>Repeat on</span> : null}</div>
                        {
                            <div style={{"flexGrow": "1"}}>
                                {
                                    [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) =>
                                    {
                                        if (this.dayIndexFor(weekOfMonth, dayOfWeek) > 30)
                                        {
                                            return null;
                                        }

                                        const disabled = isAtMaximum && !this.props.value[this.dayIndexFor(weekOfMonth, dayOfWeek)];

                                        return <Button variant="extended"
                                                color={this.props.value[this.dayIndexFor(weekOfMonth, dayOfWeek)] ? "primary" : "default"}
                                                className={`day-button ${disabled ? "disabled" : ""}`}
                                                disabled = {disabled}
                                                onClick={() => this.toggleDaysOfMonthEnabled(weekOfMonth, dayOfWeek)}>
                                            {(this.dayIndexFor(weekOfMonth, dayOfWeek) + 1)}
                                            {
                                                this.dayIndexFor(weekOfMonth, dayOfWeek) % 10 === 0  ?
                                                    this.dayIndexFor(weekOfMonth, dayOfWeek) === 10 ? "th"
                                                        : "st" : null
                                            }
                                            {
                                                this.dayIndexFor(weekOfMonth, dayOfWeek) % 10 === 1  ?
                                                    this.dayIndexFor(weekOfMonth, dayOfWeek) === 11 ? "th"
                                                        : "nd" : null
                                            }
                                            {
                                                this.dayIndexFor(weekOfMonth, dayOfWeek) % 10 === 2  ?
                                                    this.dayIndexFor(weekOfMonth, dayOfWeek) === 12 ? "th"
                                                        : "rd" : null
                                            }
                                            {
                                                this.dayIndexFor(weekOfMonth, dayOfWeek) % 10 > 2 ? "th" : null
                                            }
                                        </Button>;
                                    })
                                }
                            </div>
                        }
                    </div>
                )
            }
        </div>
    }
}



const mapStateToProps = (state) => {return { ...state.DaysOfMonthSelector} };
export default connect(mapStateToProps)(DaysOfMonthSelector);
