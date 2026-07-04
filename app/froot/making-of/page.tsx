import CaseStudy, { P, B, IC, Pre, Accent, Muted, Divider } from '@/components/CaseStudy'

export const metadata = {
  title: 'Making Of: Froot — Nina Jay Cragg',
  description: 'How I processed 45,000 Reddit posts and 16M+ data points into a shape-aware bra sizing algorithm.',
}

export default function FrootMakingOf() {
  return (
    <CaseStudy
      projectName="Froot"
      hook="45,000 Reddit posts, 56 brands, and the algorithm that actually gets bra sizing right."
      backHref="/froot"
      backLabel="Back to Froot"
      sections={[
        {
          title: 'The Problem',
          content: (
            <>
              <P>
                The bra industry&apos;s standard sizing method — measure your underbust, add 4
                inches, that&apos;s your band — is wrong. It was designed in the 1930s when
                fabrics had no stretch, and it systematically puts people in bands too loose and
                cups too small. The community at r/ABraThatFits has known this for years, but
                their knowledge exists scattered across tens of thousands of posts.
              </P>
              <P>
                I wanted to build a tool that combines real measurement math with community
                intelligence from <B>45,000+ posts</B>. Not a lookup table — an algorithm that
                understands that two people with identical measurements but different breast
                shapes need different sizes.
              </P>
            </>
          ),
        },
        {
          title: 'The Approach',
          content: (
            <>
              <P>
                The sizing algorithm rejects the +4 method entirely. Band size rounds the snug
                underbust to the nearest even number via <IC>{'roundToEven()'}</IC>, clamped
                to 26–48. But the cup calculation is where it gets interesting.
              </P>
              <P>
                Three bust measurements capture the same tissue from different angles: standing
                (compressed by gravity), leaning (maximum projection, tissue hangs freely), and
                lying (tissue spreads laterally). The key insight is that these three
                measurements should be <B>weighted differently based on breast shape</B>.
              </P>
              <Pre label="shape-weighted cup calculation">{`Projected shapes (tissue extends forward):
  bust = (standing + leaning×2 + lying) / 4
  // leaning at 2× because it's the most telling

Shallow shapes (tissue stays close to chest wall):
  bust = (standing×2 + leaning + lying) / 4
  // down-weight lean — it would overpredict volume

Moderate:
  bust = (standing + leaning + lying) / 3

Safety cap for extreme projection:
  if (leaning - standing) > 2.5":
    bust = (standing + lying) / 2 + 1`}</Pre>
              <P>
                The safety cap prevents over-sizing from extreme lean measurements — if
                someone&apos;s leaning bust is 3+ inches more than standing, the lean
                measurement is likely overpredicting actual in-bra volume.
              </P>
              <Divider />
              <P>
                The <B>style matching engine</B> layers five scoring dimensions to rank
                every bra in the database:
              </P>
              <P>
                <B>Measurement proximity</B> (max 0.25 points) — compares the user&apos;s
                calculated cup depth and width against brand-specific measurements, weighting
                depth 1.67&times; over width
                (<IC>{'cupDepthDiff*0.05 + cupWidthDiff*0.03'}</IC>).
              </P>
              <P>
                <B>Projection matching</B> (0.15 points) — scores how well a style&apos;s
                depth-to-width ratio matches the user&apos;s shape profile.
              </P>
              <P>
                <B>Root width scoring</B> (0.08 points) — compares expected root width at the
                user&apos;s cup size (<IC>{'4.5 + 0.3 * cupIndex'}</IC>) against actual
                measurements.
              </P>
              <P>
                <B>Tag affinity</B> (up to 0.24 points) — rewards styles with construction tags
                matching the user&apos;s shape. Projected shapes prefer seamed, unlined,
                balconette; shallow shapes prefer molded, t-shirt. Each match adds 0.06,
                each mismatch subtracts 0.04.
              </P>
              <P>
                <B>Data quality bonus</B> (0.08 points) — styles with more measurement samples
                (10+ and 30+ thresholds) score higher because the data is more reliable.
              </P>
              <Divider />
              <P>
                The community intelligence layer processes
                a <B>16MB search index</B> of 45,000 posts. The search
                uses <B>synonym expansion</B> (90+ mappings — &quot;spill&quot; expands to
                spillage/overflow/quadboob) and multi-field scoring: tag match gets 3 points,
                title gets 2, snippet gets 1, plus quality bonuses for post length and
                comment count. Community insights are pre-bucketed by band/cup
                range (<IC>{'32-34|D-DD'}</IC>) so each user sees sentiment data specific to
                their size neighborhood.
              </P>
              <P>
                The <B>fit check solver</B> works backwards from symptoms. It takes a current
                bra and a list of problems, then applies incremental adjustments
                with <em>conflict resolution</em>. Band too loose &rarr; down 2, up 1 cup
                (volume conservation). Gore doesn&apos;t tack &rarr; up 1 cup. The tricky
                cases: straps falling but band feels fine &rarr; the band is actually too
                loose (counter-intuitive), so down 2 and up 1. When signals conflict, explicit
                priority rules resolve the contradiction.
              </P>
            </>
          ),
        },
        {
          title: 'The Hard Parts',
          content: (
            <>
              <P>
                <B>Shape-aware cup calculation.</B> Same measurements, different sizes. Two
                people with identical bust and underbust numbers but different tissue
                distributions (projected vs. shallow) genuinely need different cup sizes.
                Building this into the algorithm required understanding the biomechanics —
                projected tissue creates more forward volume per inch of circumference than
                shallow tissue.
              </P>
              <P>
                The three-measurement approach with shape-dependent weighting captures this,
                but calibrating the weights required working through hundreds of real fitting
                scenarios from the community data. The 2&times; leaning weight for projected
                shapes and the 2.5-inch safety cap emerged from testing against the 231
                documented size transitions in the dataset — cases where someone reported both
                their old (wrong) size and their new (correct) size.
              </P>
              <Divider />
              <P>
                <B>Multi-issue fit solving.</B> Real fit problems are rarely single-cause.
                Straps falling could mean the band is too loose (sizing issue), the straps are
                too wide-set (shape issue), or the cup is too small (weight pulls everything
                down). My solver handles this through priority ordering — band corrections
                first, then cup adjustments, then shape-based style recommendations.
              </P>
              <P>
                The hardest case is when signals <Accent>contradict</Accent>. User says the band
                feels fine but it&apos;s riding up. Riding up means it <em>is</em> too loose —
                gravity pulls the front down, the back rides up as a lever. The solver needs to
                override self-reported comfort with diagnostic evidence. This kind of
                domain-specific reasoning is what makes it more than a lookup table.
              </P>
              <Divider />
              <P>
                <B>56 brands, no consistent measurement system.</B> A 34D at Panache has
                different cup depth and wire width than a 34D at Natori. The size label is
                almost meaningless across brands. The conversion engine
                uses a weighted distance
                metric: <IC>{'abs(cupDepth_diff)*2.5 + abs(cupWidth_diff)*1.5'}</IC> to find
                actual measurement matches, ignoring labels entirely. This required aggregating
                500,000+ individual measurement data points
                from the community into <IC>{'style-measurements.json'}</IC> — 5MB of structured
                measurement data across every brand and style.
              </P>
              <P>
                The deduplication logic (max 2 styles per brand, 15 total results) and the
                acceptance threshold (reject matches with distance &gt; 3) prevent the results
                from being dominated by a single well-documented brand or returning
                false-confidence matches.
              </P>
            </>
          ),
        },
        {
          title: 'What I\'d Do Differently',
          content: (
            <>
              <P>
                The sizing algorithm is <B>rule-based</B> — handcrafted weights and thresholds
                calibrated against community data. A trained model could learn the mapping from
                measurements + shape &rarr; size from the 231 documented size transitions.
                The challenge is that the training data is biased toward people who
                discovered they were in the wrong size — the model would need careful
                calibration against known-correct fittings to avoid systematically
                over-correcting.
              </P>
              <P>
                I&apos;d add a <B>feedback loop</B> where users report whether recommendations
                actually fit. Right now the system is one-directional — measurements in, size
                out. Accumulating fit feedback per brand and style would let the scoring weights
                self-calibrate. If users consistently report that Brand X&apos;s 34G runs small,
                the system should learn to bump up recommendations. The profile system
                with <IC>{'fitFeedback'}</IC> array is already designed for this — it stores
                brand, style, size, and rating — but the scoring engine doesn&apos;t consume
                it yet.
              </P>
              <P>
                The aesthetic goal integration could be deeper. Right now it re-ranks matches by
                tag affinity
                (<IC>{'0.55 * fitScore + 0.45 * goalAffinity'}</IC>), but it doesn&apos;t
                reason about <B>shape-goal interactions</B> beyond a fixed bonus table. A
                projected shape looking for lift benefits differently from a shallow shape
                looking for lift — the physics of tissue support are different, and the style
                recommendations should reflect that at a more granular level than the current
                &plusmn;0.1 shape boosts.
              </P>
            </>
          ),
        },
      ]}
    />
  )
}
