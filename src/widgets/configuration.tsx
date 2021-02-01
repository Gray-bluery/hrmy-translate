import React from 'react';

interface PropsType {
  version: string;
  onClickOverlay: (event: React.MouseEvent<HTMLDivElement>) => void;
  defaultFontSize: number;
  onChangeFontSize: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultDevelopmentMode: boolean;
  onChangeDevelopmentMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
  defaultEditableMode: boolean;
  onChangeEditableMode: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export class Configuration extends React.Component<PropsType, {}> {
  constructor(props: PropsType) {
    super(props);
  }

  render() {
    return (
      <div className="overlay" onClick={this.props.onClickOverlay}>
        <div className="dialog">
          <p>
            이 프로그램은 비공식입니다.
            <br />
            This program is unofficial.
          </p>
          <label>글자 크기 (단위: mm)</label>
          <input
            type="range"
            id="font-size"
            min="1"
            max="11"
            defaultValue={this.props.defaultFontSize}
            onChange={this.props.onChangeFontSize}
          />
          <input
            type="checkbox"
            id="development-mode"
            defaultChecked={this.props.defaultDevelopmentMode}
            onChange={this.props.onChangeDevelopmentMode}
          />
          <label htmlFor="development-mode">개발자 모드</label>
          <input
            type="checkbox"
            id="editable-mode"
            defaultChecked={this.props.defaultEditableMode}
            onChange={this.props.onChangeEditableMode}
          />
          <label htmlFor="editable-mode">편집 모드</label>

          <p>버전: v{this.props.version}</p>
        </div>
      </div>
    );
  }
}
