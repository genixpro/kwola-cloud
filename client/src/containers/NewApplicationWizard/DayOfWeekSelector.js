import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import {connect, Provider} from 'react-redux';


class DayOfWeekSelector extends Component {
    state = {}

    dayOfWeekChanged(newDay)
    {
        if (this.props.disabled)
        {
            return;
        }

        if (this.props.onChange)
        {
            this.props.onChange(newDay);
        }
    }

    render()
    {
        return <TextField
                id="select-currency-native"
                select
                value={this.props.value}
                onChange={(event) => this.dayOfWeekChanged(event.target.value)}
                SelectProps={{
                    native: true,
                    MenuProps: {
                        className: 'menu',
                    },
                }}
            >
            {
                ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayOfWeek, dayOfWeekIndex) =>
                    <option value={dayOfWeekIndex}>
                        {dayOfWeek}
                    </option>
                )
            }
            </TextField>
    }
}



const mapStateToProps = (state) => {return { ...state.DayOfWeekSelector} };
export default connect(mapStateToProps)(DayOfWeekSelector);

