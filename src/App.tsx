import "./styles.css";
// @ts-ignore
import styles from "./MuxPlayerCuePointsMeditate.module.css";
import { useReducer, useRef, useState, useEffect } from "react";
import type { CSSProperties } from "react";
import MuxPlayer from "@mux/mux-player-react";
import type MuxPlayerElement from "@mux/mux-player";

const noop = (..._values: any[]): void => {};

const isNil = (value: any): value is null | undefined => {
  return value == null;
};

const formatTime = (seconds: number | undefined) => {
  if (isNil(seconds)) return "--:--:--";
  const date = new Date(0);
  date.setSeconds(seconds);
  const substrStart = seconds / (60 * 60) >= 1 ? 11 : 14;
  const timeString = date.toISOString().substring(substrStart, 19);
  return timeString;
};

type CuePointValue = {
  type?: any;
  description: string;
  skip?: boolean;
};

type AbbreviableCuePointValue = CuePointValue & {
  type: "abbreviable";
  duration?: number;
};

type CuePoint = {
  time: number;
  value: CuePointValue | AbbreviableCuePointValue;
};

const initialCuePoints: CuePoint[] = [
  {
    time: 0,
    value: {
      skip: true,
      description: "Pre-meditation (discuss research, etc.)",
    },
  },
  {
    time: 60 * 6 + 2,
    value: {
      description: "Preparing to begin meditation practice",
    },
  },
  {
    time: 60 * 8 + 18,
    value: {
      description: "Meditation practice begins",
    },
  },
  {
    time: 60 * 16 + 47,
    value: {
      description: "Preparing for silent self-practice",
    },
  },
  {
    time: 60 * 17 + 14,
    value: {
      type: "abbreviable",
      description: "Silent self practice",
      duration: undefined,
    },
  },
  {
    time: 60 * 27 + 30,
    value: {
      description: "Preparing to end meditation practice",
    },
  },
  {
    time: 60 * 29 + 43,
    value: {
      skip: true,
      description: "Beginning of post-meditation discussion",
    },
  },
];

const CuePointRenderer = ({
  cuePoint,
  active = false,
  disableUpdates = false,
  onCuePointSelected = noop,
  onCuePointChange = noop,
}: {
  cuePoint: CuePoint;
  active?: boolean;
  disableUpdates?: boolean;
  onCuePointSelected?: (cuePoint: CuePoint) => void;
  onCuePointChange?: (cuePoint: CuePoint) => void;
}) => {
  const { time, value } = cuePoint;
  const { description, skip = false } = value;
  const skipInputId = `cuepoint-skip-${time}`;
  const activeStyle: CSSProperties = active
    ? { backgroundColor: "lightgreen" }
    : {};
  return (
    <>
      <button
        style={activeStyle}
        onClick={() => onCuePointSelected(cuePoint)}
        disabled={skip}
      >
        {formatTime(time)}
      </button>
      <div>{description}</div>
      <div>
        <input
          id={skipInputId}
          type={"checkbox"}
          defaultChecked={skip}
          disabled={disableUpdates}
          onChange={({ target }) => {
            const skip = target.checked;
            onCuePointChange({ time, value: { ...value, skip } });
          }}
        />
        <label htmlFor={skipInputId}>Skip</label>
      </div>
    </>
  );
};

const CuePointsList = ({
  cuePoints = [],
  activeCuePoint,
  disableUpdates = false,
  onCuePointSelected = noop,
  onCuePointChange = noop,
}: {
  cuePoints: CuePoint[];
  activeCuePoint?: CuePoint;
  disableUpdates?: boolean;
  onCuePointSelected?: (cuePoint: CuePoint) => void;
  onCuePointChange?: (cuePoint: CuePoint) => void;
}) => {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "20% 70% 10%",
        gridAutoRows: "1fr",
        gridGap: "10px",
      }}
    >
      {cuePoints.map((cuePoint, i) => {
        return (
          <CuePointRenderer
            key={cuePoint.time}
            cuePoint={cuePoint}
            disableUpdates={disableUpdates}
            active={activeCuePoint?.time === cuePoint.time}
            onCuePointChange={onCuePointChange}
            onCuePointSelected={onCuePointSelected}
          />
        );
      })}
    </div>
  );
};

const addCuePointsToPlayer = (
  cuePoints: CuePoint[],
  playerEl: MuxPlayerElement
) => {
  const actualCuePoints = cuePoints.reduce((cuePoints, cuePoint) => {
    if (cuePoint.value.type === "abbreviable") {
      const value: AbbreviableCuePointValue =
        cuePoint.value as AbbreviableCuePointValue;
      console.log("abbreviable cuepoint");
      if (!isNil(value.duration)) {
        console.log("duration?", value.duration);
        console.log("cuePoint", cuePoint);
        const duration: number = value.duration;
        const insertedSkipCuePoint = {
          time: cuePoint.time + duration,
          value: {
            description: "(Skipped silent self practice)",
            skip: true,
          },
        };
        return [...cuePoints, cuePoint, insertedSkipCuePoint];
      }
    }
    return [...cuePoints, cuePoint];
  }, [] as CuePoint[]);
  playerEl.addCuePoints(actualCuePoints);
};

const setCurrentTimeOnPlayer = (
  time: number,
  playerEl?: MuxPlayerElement | null
) => {
  if (!playerEl || playerEl.currentTime === time) return;
  playerEl.currentTime = time;
};

type ActionType = "UPDATE";
const reducer = (
  cuePoints: CuePoint[],
  action: { type: ActionType; value: CuePoint }
) => {
  if (action.type === "UPDATE") {
    const cuePointIdx = cuePoints.findIndex(
      (cuePoint) => cuePoint.time === action.value.time
    );
    return [
      ...cuePoints.slice(0, cuePointIdx),
      action.value,
      ...cuePoints.slice(cuePointIdx + 1),
    ];
  }
  return cuePoints;
};

const UCLAHeader = () => {
  return (
    <header
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0",
      }}
    >
      <h1 style={{ padding: `0 2.5rem`, margin: "0 0 1rem" }}>
        <span role="img" aria-label="Meditating Person Emoji">
          🧘‍♂️
        </span>{" "}
        Mindful Meditation
      </h1>
    </header>
  );
};

const DurationList = ({
  values = [],
  selectedValue,
  disableUpdates = false,
  onSelected = noop,
}: {
  values: number[];
  selectedValue?: number;
  disableUpdates?: boolean;
  onSelected?: (duration: number) => void;
}) => {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {values.map((duration) => {
        const selectedStyle =
          duration === selectedValue ? styles.durationSelected : undefined;
        return (
          <button
            className={selectedStyle}
            disabled={disableUpdates}
            key={duration}
            onClick={() => {
              onSelected(duration);
            }}
          >
            {Math.round(duration / 60)} min
          </button>
        );
      })}
    </div>
  );
};

function MuxPlayerPage() {
  const [cuePoints, dispatch] = useReducer(reducer, initialCuePoints);
  const [abbreviableCuePointIndex, setAbbreviableCuePoint] = useState<
    number | undefined
  >(undefined);
  const playerElRef = useRef<MuxPlayerElement | null>(null);
  const [activeCuePoint, setActiveCuePoint] = useState<CuePoint | undefined>(
    undefined
  );
  const [startTime, setStartTime] = useState<number | undefined>(undefined);
  const [mediaDuration, setMediaDuration] = useState<number>(Number.NaN);
  const [meditationDuration, setMeditationDuration] = useState<
    number | undefined
  >(undefined);
  const [cuePointsAdded, setCuePointsAdded] = useState(false);

  useEffect(() => {
    const nextStartTime = cuePoints.find(
      (cuePoint) => !cuePoint.value.skip
    )?.time;
    if (nextStartTime === startTime) return;
    setStartTime(nextStartTime ?? 0);
  }, [cuePoints, startTime]);

  useEffect(() => {
    const idx = cuePoints.findIndex(
      ({ value: { type } }) => type === "abbreviable"
    );
    if (idx === abbreviableCuePointIndex) return;
    setAbbreviableCuePoint(idx);
  }, [cuePoints, abbreviableCuePointIndex]);

  useEffect(() => {
    setCurrentTimeOnPlayer(startTime ?? 0, playerElRef.current);
  }, [startTime]);

  useEffect(() => {
    if (!(Array.isArray(cuePoints) && Number.isFinite(mediaDuration))) return;
    const nextDuration = cuePoints.reduce((sum, cuePoint, i, cuePoints) => {
      if (cuePoint.value.skip) return sum;
      if (cuePoint.value.type === "abbreviable") {
        const { duration } = cuePoint.value as AbbreviableCuePointValue;
        if (!isNil(duration)) return sum + duration;
      }

      const duration =
        (cuePoints[i + 1]?.time ?? mediaDuration) - cuePoint.time;
      return sum + duration;
    }, 0);
    setMeditationDuration(nextDuration);
  }, [cuePoints, mediaDuration]);

  return (
    <>
      <UCLAHeader />
      <section style={{ padding: `0 2.5rem`, margin: `0 0 2.5rem` }}>
        <div
          className={styles.description}
          style={{ fontSize: `1rem`, fontWeight: 400, lineHeight: 1.5 }}
        >
          <span>The </span>
          <a href="https://www.uclahealth.org/programs/marc">
            Mindful Awareness Research Center (MARC)
          </a>
          <span>
            {" "}
            provides fantastic, free, guided meditations, but wouldn't it be
            nice if you could just dive right into the meditation practice?
          </span>
          <p>
            Wouldn't it be even better if you could adjust how long the silent
            self-practice was based on your level of comfort or available time?
            That's exactly what this application lets you do!
          </p>
          <p>
            You may also choose to skip (or not skip) any parts of the
            meditation recording as appropriate, for example, skipping the
            meditation preparation and starting immediately with the meditation
            itself if you're already situated or time constrained.
          </p>
        </div>
      </section>
      <section
        className={styles.main}
        style={{
          margin: `0 0 3rem`,
          padding: `2.5rem`,
          borderRadius: `0.25rem`,
        }}
      >
        <MuxPlayer
          ref={playerElRef}
          style={{ background: "black" }}
          audio
          stream-type="on-demand"
          title="Drop-In Mediations Back to the Basics (UCLA MARC, Jan 26, 2023)"
          startTime={startTime}
          playbackId="UwsB8i59qz54R2yX91rnUJqmxSG6eHHt4g66YQ5eUFE"
          preload="metadata"
          onDurationChange={({ target }) => {
            const muxPlayerEl = target as MuxPlayerElement;
            setMediaDuration(muxPlayerEl.duration);
          }}
          onPlay={({ target }) => {
            const muxPlayerEl = target as MuxPlayerElement;
            addCuePointsToPlayer(cuePoints, muxPlayerEl);
            setCuePointsAdded(true);
          }}
          onCuePointChange={({ target }) => {
            const muxPlayerEl = target as MuxPlayerElement;
            const activeCuePoint = muxPlayerEl.activeCuePoint;
            setActiveCuePoint(activeCuePoint);
            // If we're playing through and the activeCuePoint is one that
            // should be skipped, skip it.
            if (!muxPlayerEl.paused && activeCuePoint?.value.skip) {
              const cuePoints = muxPlayerEl.cuePoints;
              // Find the next CuePoint that shouldn't be skipped
              const nextCuePointToPlay = cuePoints.find(
                ({ time, value: { skip } }) =>
                  time > activeCuePoint.time && !skip
              );
              // Seek to the time of the next unskipped CuePoint (or to the end of the content if there are none)
              setCurrentTimeOnPlayer(
                nextCuePointToPlay
                  ? nextCuePointToPlay.time
                  : muxPlayerEl.duration,
                muxPlayerEl
              );
            }
          }}
          onEnded={() => {
            setActiveCuePoint(undefined);
          }}
        />
        <div style={{ fontWeight: "bold" }}>
          Total Meditation Time: {formatTime(meditationDuration)}
        </div>
        <div style={{ margin: `4rem 0` }}>
          <h2 style={{ margin: `0 0 0.5rem` }}>
            Silent self practice duration
          </h2>
          <h3
            className={styles.abbreviatedSubtitle}
            style={{ margin: `0 0 2rem`, fontWeight: 400 }}
          >
            How long would you like your silent self practice to be?
          </h3>
          <DurationList
            values={[1 * 60, 2 * 60, 3 * 60, 5 * 60, 10 * 60]}
            selectedValue={
              abbreviableCuePointIndex != null
                ? (
                    cuePoints[abbreviableCuePointIndex]
                      ?.value as AbbreviableCuePointValue
                  )?.duration
                : undefined
            }
            disableUpdates={cuePointsAdded}
            onSelected={(duration) => {
              if (
                abbreviableCuePointIndex != null &&
                abbreviableCuePointIndex >= 0
              ) {
                const cuePoint = {
                  time: cuePoints[abbreviableCuePointIndex].time,
                  value: {
                    ...cuePoints[abbreviableCuePointIndex].value,
                    duration,
                  },
                };
                dispatch({ type: "UPDATE", value: cuePoint });
              }
            }}
          />
        </div>
        <CuePointsList
          cuePoints={cuePoints}
          activeCuePoint={activeCuePoint}
          disableUpdates={cuePointsAdded}
          onCuePointSelected={({ time }) => {
            setCurrentTimeOnPlayer(time, playerElRef.current);
          }}
          onCuePointChange={(cuePoint) => {
            dispatch({ type: "UPDATE", value: cuePoint });
          }}
        />
      </section>
      <footer>
        <p>
          <span>This application uses </span>
          <a href="https://github.com/muxinc/elements/tree/main/packages/mux-player-react">
            Mux Player (React)
          </a>
          <span>, a fully open source media player for </span>
          <a href="https://www.mux.com/">Mux, Inc.</a>
          <span>
            {" "}
            The content is part of UCLA MARC's "Drop in Meditations" series,
            graciously provided under a Creative Commons License. You may find a
            list of all of their Drop in Meditations{" "}
          </span>
          <a href="https://www.uclahealth.org/programs/marc/free-guided-meditations/drop-meditations-hammer-podcast">
            here
          </a>
          <span>
            . You can also find information on another great and free resource,
            the UCLA Mindful mobile application,{" "}
          </span>
          <a href="https://www.uclahealth.org/programs/marc/free-programming-resources/ucla-mindful-app">
            here
          </a>
          <span>.</span>
        </p>
        <p>
          <span>
            “Drop-in Meditations” created by Diana Winston and others (see
            above) for the{" "}
          </span>
          <a href="http://www.uclahealth.org/marc">
            UCLA Mindful Awareness Research Center (MARC)
          </a>
          <span>
            , ©2011- 2021 The Regents of the University of California (The UC
            Regents).
          </span>
        </p>
        <p>
          <span>Drop-in Meditations are licensed under a </span>
          <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
            Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
            International License
          </a>
          <span>.</span>
        </p>
        <ul>
          <li>
            <span>
              <strong>NonCommercial</strong> — You may not use the material for{" "}
            </span>
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              commercial purposes
            </a>
            <span>.</span>
          </li>
          <li>
            <span>
              <strong>NoDerivatives</strong> — If you{" "}
            </span>
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              remix, transform, or build upon
            </a>
            <span>
              {" "}
              the material, you may not distribute the modified material.
            </span>
          </li>
          <li>
            <span>
              <strong>No additional restrictions</strong> — You may not apply
              legal terms or{" "}
            </span>
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              technological measures
            </a>
            <span>
              {" "}
              that legally restrict others from doing anything the license
              permits.
            </span>
          </li>
          <li>
            <span>
              <strong>Attribution</strong> — You must give{" "}
            </span>
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              appropriate credit
            </a>
            <span>, provide a a to the license, and </span>
            <a href="https://creativecommons.org/licenses/by-nc-nd/4.0/">
              indicate if changes were made
            </a>
            <span>
              . You may do so in any reasonable manner, but not in any way that
              suggests the licensor (The UC Regents) endorses you or your use.
            </span>
          </li>
        </ul>
      </footer>
    </>
  );
}

export default MuxPlayerPage;
