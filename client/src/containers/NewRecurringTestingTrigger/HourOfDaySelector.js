import React, { Component } from 'react';
import TextField from '../../components/uielements/textfield';
import {connect, Provider} from 'react-redux';


class HourOfDaySelector extends Component {
    state = {}

    hourOfDayChanged(newHour)
    {
        if (this.props.disabled)
        {
            return;
        }

        if (this.props.onChange)
        {
            this.props.onChange(newHour);
        }
    }

    render()
    {
        return <TextField
                id="select-currency-native"
                select
                value={this.props.value}
                onChange={(event) => this.hourOfDayChanged(event.target.value)}
                SelectProps={{
                    native: true,
                    MenuProps: {
                        className: 'menu',
                    },
                }}
            >
                {
                    [0,1,2,3,4,5].map((hour) =>
                        <option value={hour}>
                            {hour === 0 ? 12 : hour} am
                        </option>
                    )
                }
                <br/>
                {
                    [6,7,8,9,10,11].map((hour) =>
                        <option value={hour}>
                            {hour === 0 ? 12 : hour} am
                        </option>
                    )
                }
                <br/>
                {
                    [12,13,14,15,16,17].map((hour) =>
                        <option value={hour}>
                            {hour === 12 ? 12 : (hour - 12)} pm
                        </option>
                    )
                }
                <br/>
                {
                    [18,19,20,21,22,23].map((hour) =>
                        <option value={hour}>
                            {hour === 12 ? 12 : (hour - 12)} pm
                        </option>
                    )
                }
            </TextField>
    }
}



const mapStateToProps = (state) => {return { ...state.HourOfDaySelector} };
export default connect(mapStateToProps)(HourOfDaySelector);

